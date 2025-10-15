#!/usr/bin/env python3
# sitemap_e_indexador.py
# Autor: Gemini & Weverton Costa (revisto por ChatGPT)
# Versão: 8.1.2 (integra inspeção, envio em lotes, proteção contra 429, exclusões melhorias)

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

# Adicione no topo do seu script (imports necessários)
from google.oauth2 import service_account
from google.auth.transport.requests import Request as GoogleRequest

# ---------------------------------------------------------------------
# Configuração padrão (podem ser sobrescritas por args)
# ---------------------------------------------------------------------
DEFAULT_KEYS_FILE = "keys.json"
OUTPUT_XML_FILE = "sitemap.xml"
OUTPUT_TXT_FILE = "sitemap.txt"
PENDING_URLS_FILE = "pending_urls.json"
INDEX_REPORT_FILE = "index_report.json"

# Indexing API scope (publish notifications)
INDEXING_SCOPES = ["https://www.googleapis.com/auth/indexing"]
# URL Inspection scope (Search Console)
INSPECTION_SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]

INDEXING_API_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish"
INSPECTION_ENDPOINT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"

# Diretórios a excluir (padrão). Podemos detectar também arquivos/dirs começando com '.'
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
        # restringe permissões do arquivo temporário (se suportado pelo SO)
        try:
            os.chmod(temp_name, 0o600)
        except Exception:
            print("⚠️ Não foi possível alterar permissões do arquivo temporário (os.chmod falhou).")
        print(f"✓ Credenciais do Google extraídas para '{temp_name}'.")
    except IOError as e:
        die(f"Não foi possível criar o arquivo temporário de credenciais: {e}")

    return keys, temp_name

def is_excluded(path: Path):
    """
    Exclui diretórios/arquivos ocultos (começando com '.') e EXCLUDE_DIRS.
    path deve ser relativo ao root_path (Path.relative_to(root_path)).
    """
    # se alguma parte começa com '.', ignore
    if any(part.startswith('.') for part in path.parts):
        return True
    # se alguma parte está na lista de exclusão
    if any(part in EXCLUDE_DIRS for part in path.parts):
        return True
    return False

def build_url_from_base_and_path(base_url: str, relative_parts):
    """
    Monta URL segura: remove 'docs' dos parts, monta path e usa urljoin.
    """
    if not base_url.endswith("/"):
        base_url = base_url + "/"
    parts = [p for p in relative_parts if p != "docs"]
    if not parts:
        return base_url
    path = "/".join(parts)
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
# HTTP helpers (HEAD -> fallback GET)
# ---------------------------------------------------------------------
def make_requests_session():
    s = requests.Session()
    s.headers.update({
        "User-Agent": "sitemap-indexer/1.0 (+https://example.com)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    })
    return s

def check_url_alive(session, url, timeout=6):
    """
    Retorna (True, status_code) se a URL responde 200 com HEAD ou GET fallback.
    Caso de falha de conexão retorna (False, None).
    """
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
# Core: gerar sitemap
# ---------------------------------------------------------------------
def gerar_sitemaps(base_url, root_dir, output_xml=OUTPUT_XML_FILE, output_txt=OUTPUT_TXT_FILE):
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
        if rel.name == "index.html":
            parent_parts = list(rel.parent.parts)
            url = build_url_from_base_and_path(base_url, parent_parts)
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
    with open(output_xml, "w", encoding="utf-8") as f:
        f.write(xml_str)
    print(f"✓ Arquivo '{output_xml}' criado.")

    with open(output_txt, "w", encoding="utf-8") as f:
        f.write("\n".join([d["loc"] for d in valid]))
    print(f"✓ Arquivo '{output_txt}' criado.")

    print("\n✅ Sitemaps gerados com sucesso!")
    return [d["loc"] for d in valid]

# ---------------------------------------------------------------------
# Envio em lotes para Indexing API (com proteção contra 429 e grava pending)
# ---------------------------------------------------------------------
def enviar_urls_em_lotes(urls, cred_file, batch_size=40, delay_between_requests=1.0, pending_file=PENDING_URLS_FILE):
    """
    Envia urls em lotes. Se receber 429, grava URLs restantes em pending_file e retorna.
    Requer google-auth instalado (service_account).
    """
    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import Request as GoogleRequest
    except ImportError:
        print("ERRO: Bibliotecas Google não instaladas. Execute:\n  pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib")
        return []

    # Obter token
    try:
        creds = service_account.Credentials.from_service_account_file(cred_file, scopes=INDEXING_SCOPES)
        creds.refresh(GoogleRequest())
        token = creds.token
        if not token:
            print("ERRO: Não foi possível obter token de autenticação para Indexing API.")
            return []
    except Exception as e:
        print(f"ERRO na autenticação (Indexing API): {e}")
        return []

    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "sitemap-indexer/1.0",
    })

    sent = []
    for i in range(0, len(urls), batch_size):
        batch = urls[i:i+batch_size]
        for u in batch:
            idx = len(sent) + 1
            print(f"[{idx}/{len(urls)}] Enviando: {u} ... ", end="")
            body = {"url": u, "type": "URL_UPDATED"}
            try:
                r = session.post(INDEXING_API_ENDPOINT, json=body, timeout=15)
                if r.status_code == 200:
                    print("OK")
                    sent.append(u)
                elif r.status_code == 429:
                    # Quota excedida — gravar pendentes e retornar
                    remaining = [x for x in urls if x not in sent]
                    with open(pending_file, "w", encoding="utf-8") as f:
                        json.dump(remaining, f, indent=2, ensure_ascii=False)
                    print(f"ERRO (429): Quota excedida — URLs restantes salvas em {pending_file}")
                    return sent
                else:
                    try:
                        err = r.json().get("error", {}).get("message", r.text)
                    except Exception:
                        err = r.text
                    print(f"ERRO ({r.status_code}): {err}")
            except requests.exceptions.RequestException as e:
                print(f"FALHA NA CONEXÃO: {e}")
            time.sleep(delay_between_requests)
    print(f"\n✅ Envio em lote concluído. Total enviados: {len(sent)}")
    # se tiver pending_file e existir anteriormente, remover (já enviou tudo)
    if os.path.exists(pending_file):
        try:
            os.remove(pending_file)
        except Exception:
            pass
    return sent

# Wrapper (mantido por compatibilidade)
def enviar_urls_para_google(urls_para_enviar, cred_file, batch_size=40, delay_between_requests=1.0, pending_file=PENDING_URLS_FILE):
    if not urls_para_enviar:
        print("Nenhuma URL para enviar. Pulando etapa de indexação.")
        return []
    print("\n--- ETAPA D: Enviando URLs para a API de Indexação do Google (em lotes) ---")
    sent = enviar_urls_em_lotes(urls_para_enviar, cred_file, batch_size=batch_size, delay_between_requests=delay_between_requests, pending_file=pending_file)
    print("\n✅ Processo de envio para o Google concluído.")
    return sent

# ---------------------------------------------------------------------
# Checagem de indexação via URL Inspection API (Search Console)
# ---------------------------------------------------------------------
def checar_indexacao_gsc(urls, cred_file, site_url, out_json=INDEX_REPORT_FILE, sleep_between=1.0):
    """
    Para cada URL em `urls` faz POST em INSPECTION_ENDPOINT
    e salva os resultados em out_json.
    site_url deve ser sua propriedade exata (ex: "https://wevertongomescosta.github.io/").
    A service account precisa ser usuário no Search Console para a propriedade.
    """
    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import Request as GoogleRequest
    except ImportError:
        print("ERRO: Bibliotecas Google não instaladas. Execute:\n  pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib")
        return []

    try:
        creds = service_account.Credentials.from_service_account_file(cred_file, scopes=INSPECTION_SCOPES)
    except Exception as e:
        print(f"ERRO ao carregar credenciais para URL Inspection: {e}")
        return []

    try:
        creds.refresh(GoogleRequest())
    except Exception as e:
        print(f"ERRO ao renovar token de credenciais: {e}")
        return []

    token = creds.token
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    session = requests.Session()
    session.headers.update({"User-Agent": "index-checker/1.0"})
    results = []

    print("\n--- ETAPA E: Checando indexação via URL Inspection API ---")
    for i, u in enumerate(urls, start=1):
        print(f"[{i}/{len(urls)}] Inspecionando: {u} ... ", end="")
        body = {"inspectionUrl": u, "siteUrl": site_url}
        try:
            r = session.post(INSPECTION_ENDPOINT, headers=headers, json=body, timeout=30)
            if r.status_code == 200:
                payload = r.json()
                idx = payload.get("inspectionResult", {}).get("indexStatusResult", {})
                indexed_summary = {
                    "coverageState": idx.get("coverageState"),
                    "indexingState": idx.get("indexingState"),
                    "lastCrawlTime": idx.get("lastCrawlTime"),
                    "robotsTxtState": idx.get("robotsTxtState"),
                    "googleCanonical": idx.get("googleCanonical"),
                    "referringUrls": idx.get("referringUrls"),
                }
                results.append({"url": u, "status_code": 200, "indexed_summary": indexed_summary, "raw": payload})
                print("OK (inspeção retornou dados)")
            else:
                try:
                    err = r.json().get("error", {}).get("message", r.text)
                except Exception:
                    err = r.text
                results.append({"url": u, "status_code": r.status_code, "error": err})
                print(f"ERRO ({r.status_code})")
        except requests.exceptions.RequestException as e:
            results.append({"url": u, "status_code": None, "error": str(e)})
            print("FALHA NA CONEXÃO")
        time.sleep(sleep_between)

    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"✓ Relatório salvo em {out_json}")
    return results

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
    p.add_argument("--inspect", action="store_true", help="Após enviar, checa indexação via URL Inspection API e salva index_report.json")
    p.add_argument("--inspect-sleep", type=float, default=1.0, help="Segundos entre chamadas da URL Inspection API (padrão 1.0s)")
    p.add_argument("--batch-size", type=int, default=40, help="Tamanho do lote para envio ao Indexing API (padrão 40)")
    p.add_argument("--batch-delay", type=float, default=1.0, help="Segundos entre requisições ao Indexing API (padrão 1.0s)")
    p.add_argument("--pending-file", default=PENDING_URLS_FILE, help="Arquivo para gravar URLs pendentes após 429 (padrão pending_urls.json)")
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
        # gerar sitemap(s)
        urls_validadas = gerar_sitemaps(base_url, root_dir)
        # enviar se houver urls e não estiver em dry-run / skip
        sent_urls = []
        if urls_validadas and not (args.dry_run or args.skip_index):
            sent_urls = enviar_urls_para_google(
                urls_validadas,
                TEMP_GOOGLE_CREDS_FILE,
                batch_size=args.batch_size,
                delay_between_requests=args.batch_delay,
                pending_file=args.pending_file
            )
        elif urls_validadas and (args.dry_run or args.skip_index):
            print("\n--dry-run ativado: pulando envio para API do Google.")
            sent_urls = []

        # inspeção opcional (somente se solicitado)
        if args.inspect and urls_validadas:
            # certifique-se de que TEMP_GOOGLE_CREDS_FILE ainda existe (será removido no finally)
            if TEMP_GOOGLE_CREDS_FILE and os.path.exists(TEMP_GOOGLE_CREDS_FILE):
                site_prop = base_url if base_url.endswith("/") else base_url + "/"
                # é razoável inspecionar as URLs que enviamos com OK, se não enviou, inspecione as validadas
                to_inspect = sent_urls if sent_urls else urls_validadas
                checar_indexacao_gsc(to_inspect, TEMP_GOOGLE_CREDS_FILE, site_prop, out_json=INDEX_REPORT_FILE, sleep_between=args.inspect_sleep)
            else:
                print("⚠️ Não foi possível executar URL Inspection: arquivo de credenciais temporário não encontrado.")
    finally:
        # Garante que o arquivo de credenciais temporário seja sempre excluído
        if TEMP_GOOGLE_CREDS_FILE and os.path.exists(TEMP_GOOGLE_CREDS_FILE):
            try:
                os.remove(TEMP_GOOGLE_CREDS_FILE)
                print(f"\n✓ Arquivo temporário '{TEMP_GOOGLE_CREDS_FILE}' excluído com segurança.")
            except OSError as e:
                print(f"\n✗ Erro ao excluir arquivo temporário: {e}")

    print("\nTodos os processos foram finalizados.")


