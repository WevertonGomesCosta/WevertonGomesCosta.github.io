#!/usr/bin/env python3
# sitemap_e_indexador.py (versão revisada)
# Autor: Gemini & Weverton Costa (revisto por ChatGPT)
# Versão: 8.1.1 (robustez, permissões, fallback HEAD/GET, argparse)

import os
import sys
import time
import json
import argparse
import requests
from pathlib import Path
from datetime import datetime
from urllib.parse import urljoin
import xml.etree.ElementTree as ET
from xml.dom import minidom

# ---------------------------------------------------------------------
# Configuração padrão (podem ser sobrescritas por args)
# ---------------------------------------------------------------------
DEFAULT_KEYS_FILE = "keys.json"
OUTPUT_XML_FILE = "sitemap.xml"
OUTPUT_TXT_FILE = "sitemap.txt"
SCOPES = ["https://www.googleapis.com/auth/indexing"]
API_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish"
EXCLUDE_DIRS = {"site_libs", "output", "renv"}

# ---------------------------------------------------------------------
# Utilitários
# ---------------------------------------------------------------------
def die(msg, code=1):
    print(f"✗ ERRO: {msg}")
    sys.exit(code)

def load_and_prepare_keys(keys_file):
    """
    Carrega o keys.json, extrai as chaves obrigatórias do Google para um arquivo
    temporário e retorna (config, temp_cred_filename).
    """
    try:
        with open(keys_file, 'r', encoding='utf-8') as f:
            print(f"✓ Carregando configurações do arquivo '{keys_file}'...")
            keys = json.load(f)
    except FileNotFoundError:
        die(f"O arquivo de chaves '{keys_file}' não foi encontrado.")
    except json.JSONDecodeError:
        die(f"O arquivo '{keys_file}' contém JSON inválido.")
    # Chaves obrigatórias para service account
    required = [
        "type", "project_id", "private_key_id", "private_key",
        "client_email", "client_id", "auth_uri", "token_uri",
        "auth_provider_x509_cert_url", "client_x509_cert_url"
    ]
    missing = [k for k in required if not keys.get(k)]
    if missing:
        die(f"Chaves obrigatórias faltando em '{keys_file}': {', '.join(missing)}")

    google_creds = {k: keys[k] for k in required}
    temp_name = "temp_google_creds.json"
    try:
        with open(temp_name, "w", encoding="utf-8") as f:
            json.dump(google_creds, f, indent=2)
        # restringe permissões do arquivo temporário
        try:
            os.chmod(temp_name, 0o600)
        except Exception:
            # não fatal, mas informativo
            print("⚠️ Não foi possível alterar permissões do arquivo temporário (os.chmod falhou).")
        print(f"✓ Credenciais do Google extraídas para '{temp_name}'.")
    except IOError as e:
        die(f"Não foi possível criar o arquivo temporário de credenciais: {e}")

    return keys, temp_name

def is_excluded(path: Path):
    return any(part in EXCLUDE_DIRS for part in path.parts)

def build_url_from_base_and_path(base_url: str, relative_parts):
    """
    Monta URL segura: remove 'docs' dos parts, monta path e usa urljoin.
    Se o path representar um diretório (index), garante barra final.
    """
    # normaliza base_url para ter trailing slash
    if not base_url.endswith("/"):
        base_url = base_url + "/"
    parts = [p for p in relative_parts if p != "docs"]
    if not parts:
        return base_url
    path = "/".join(parts)
    # urljoin trata barras corretamente
    result = urljoin(base_url, path)
    return result

def pretty_xml_from_url_list(url_data):
    urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    for d in url_data:
        url_el = ET.SubElement(urlset, "url")
        ET.SubElement(url_el, "loc").text = d["loc"]
        if d.get("lastmod"):
            ET.SubElement(url_el, "lastmod").text = d["lastmod"]
    xml_str = minidom.parseString(ET.tostring(urlset)).toprettyxml(indent="  ")
    return xml_str

# ---------------------------------------------------------------------
# Verificação de URLs com fallback HEAD->GET e retries simples
# ---------------------------------------------------------------------
def make_requests_session():
    s = requests.Session()
    s.headers.update({
        "User-Agent": "sitemap-indexer/1.0 (+https://example.com)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    })
    return s

def check_url_alive(session, url, timeout=6):
    try:
        r = session.head(url, timeout=timeout, allow_redirects=True)
        if r.status_code == 200:
            return True, 200
        # Alguns servidores rejeitam HEAD (405) ou retornam 403 para HEAD — tentar GET
        if r.status_code in (403, 405) or r.status_code >= 500 or r.status_code == 0:
            r2 = session.get(url, timeout=timeout, allow_redirects=True)
            return (r2.status_code == 200), r2.status_code
        return False, r.status_code
    except requests.exceptions.RequestException:
        # última tentativa GET
        try:
            r2 = session.get(url, timeout=timeout, allow_redirects=True)
            return (r2.status_code == 200), r2.status_code
        except requests.exceptions.RequestException:
            return False, None

# ---------------------------------------------------------------------
# Funções principais
# ---------------------------------------------------------------------
def gerar_sitemaps(base_url, root_dir):
    print("--- ETAPA A: Buscando arquivos HTML ---")
    try:
        root_path = Path(root_dir)
        if not root_path.exists():
            die(f"Diretório raiz '{root_dir}' não existe.")
        html_files = list(root_path.rglob("*.html"))
    except Exception as e:
        die(f"Erro ao listar arquivos em '{root_dir}': {e}")

    html_files = [f for f in html_files if not is_excluded(f.relative_to(root_path))]
    html_files = [f for f in html_files if "WevertonGomesCosta.github.io" not in str(f)]
    html_files = [f for f in html_files if f.name.lower() != "readme.html"]

    print(f"Encontrados {len(html_files)} arquivos HTML relevantes.\n")

    candidate_urls = []
    for file_path in html_files:
        rel = file_path.relative_to(root_path)
        parts = list(rel.parts)
        # se é index.html, queremos a pasta correspondente com barra final
        if rel.name == "index.html":
            parent_parts = list(rel.parent.parts)
            url = build_url_from_base_and_path(base_url, parent_parts)
            # garantir barra final para diretório
            if not url.endswith("/"):
                url = url + "/"
        else:
            url = build_url_from_base_and_path(base_url, parts)
        lastmod = datetime.fromtimestamp(file_path.stat().st_mtime).strftime("%Y-%m-%d")
        candidate_urls.append({"loc": url, "lastmod": lastmod})

    print("--- ETAPA B: Verificando a validade das URLs ---")
    session = make_requests_session()
    valid = []
    for i, data in enumerate(candidate_urls, start=1):
        u = data["loc"]
        print(f"[{i}/{len(candidate_urls)}] Verificando: {u} ... ", end="")
        ok, code = check_url_alive(session, u)
        if ok:
            print("OK (200)")
            valid.append(data)
        else:
            print(f"INVÁLIDA ({code})")
    if not valid:
        print("\nNenhuma URL válida encontrada. Encerrando.")
        return []

    print(f"\n--- ETAPA C: Gerando sitemaps com {len(valid)} URLs válidas ---")
    xml_str = pretty_xml_from_url_list(valid)
    with open(OUTPUT_XML_FILE, "w", encoding="utf-8") as f:
        f.write(xml_str)
    print(f"✓ Arquivo '{OUTPUT_XML_FILE}' criado.")

    with open(OUTPUT_TXT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join([d["loc"] for d in valid]))
    print(f"✓ Arquivo '{OUTPUT_TXT_FILE}' criado.")

    print("\n✅ Sitemaps gerados com sucesso!")
    return [d["loc"] for d in valid]

def enviar_urls_para_google(urls_para_enviar, cred_file):
    if not urls_para_enviar:
        print("Nenhuma URL para enviar. Pulando etapa de indexação.")
        return
    print("\n--- ETAPA D: Enviando URLs para a API de Indexação do Google ---")
    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import Request
    except ImportError:
        print("ERRO: Bibliotecas Google não instaladas. Execute:\n  pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib")
        return
    try:
        creds = service_account.Credentials.from_service_account_file(cred_file, scopes=SCOPES)
        # refresh para garantir token válido
        creds.refresh(Request())
        token = creds.token
        if not token:
            print("ERRO: Não foi possível obter token de autenticação.")
            return
        print("✓ Autenticação bem-sucedida.")
    except Exception as e:
        print(f"ERRO na autenticação: {e}")
        return

    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "sitemap-indexer/1.0",
    })

    for i, url in enumerate(urls_para_enviar, start=1):
        print(f"[{i}/{len(urls_para_enviar)}] Enviando: {url} ... ", end="")
        body = {"url": url, "type": "URL_UPDATED"}
        try:
            r = session.post(API_ENDPOINT, json=body, timeout=10)
            if r.status_code == 200:
                print("OK")
            else:
                try:
                    err = r.json().get("error", {}).get("message", r.text)
                except Exception:
                    err = r.text
                print(f"ERRO ({r.status_code}): {err}")
        except requests.exceptions.RequestException as e:
            print(f"FALHA NA CONEXÃO: {e}")
        time.sleep(1)  # espaçamento para não saturar

    print("\n✅ Processo de envio para o Google concluído.")

# ---------------------------------------------------------------------
# CLI: argumentos
# ---------------------------------------------------------------------
def parse_args():
    p = argparse.ArgumentParser(description="Gerador de sitemap + envio para Indexing API")
    p.add_argument("--keys", default=DEFAULT_KEYS_FILE, help="Arquivo de chaves JSON unificado (padrão: keys.json)")
    p.add_argument("--root", default=None, help="Diretório raiz do site (sobrescreve keys.json sitemap_root_dir)")
    p.add_argument("--base-url", default=None, help="Base URL (sobrescreve keys.json sitemap_base_url)")
    p.add_argument("--dry-run", action="store_true", help="Gera sitemaps mas não envia para Google")
    p.add_argument("--skip-index", action="store_true", help="Pula etapa de indexação (equivalente a --dry-run)")
    return p.parse_args()

# ---------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------
if __name__ == "__main__":
    args = parse_args()
    TEMP_GOOGLE_CREDS_FILE = None
    try:
        config, TEMP_GOOGLE_CREDS_FILE = load_and_prepare_keys(args.keys)
        base_url = args.base_url or config.get("sitemap_base_url")
        root_dir = args.root or config.get("sitemap_root_dir")
        if not base_url or not root_dir:
            die("As chaves 'sitemap_base_url' e 'sitemap_root_dir' devem existir no keys.json ou ser fornecidas via args.")
        urls_validadas = gerar_sitemaps(base_url, root_dir)
        if urls_validadas and not (args.dry_run or args.skip_index):
            enviar_urls_para_google(urls_validadas, TEMP_GOOGLE_CREDS_FILE)
        elif urls_validadas and (args.dry_run or args.skip_index):
            print("\n--dry-run ativado: pulando envio para API do Google.")
    finally:
        if TEMP_GOOGLE_CREDS_FILE and os.path.exists(TEMP_GOOGLE_CREDS_FILE):
            try:
                os.remove(TEMP_GOOGLE_CREDS_FILE)
                print(f"\n✓ Arquivo temporário '{TEMP_GOOGLE_CREDS_FILE}' excluído com segurança.")
            except OSError as e:
                print(f"\n✗ Erro ao excluir arquivo temporário: {e}")

    print("\nTodos os processos foram finalizados.")
