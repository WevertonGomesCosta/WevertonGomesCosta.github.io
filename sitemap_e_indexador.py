import os
import time
import requests
import json
from pathlib import Path
from datetime import datetime
import xml.etree.ElementTree as ET
from xml.dom import minidom

# --- 1. Configurações Gerais ---

# -- Configurações para Geração do Sitemap (do script R) --
# URL base do seu site
BASE_URL = "https://wevertongomescosta.github.io"
# Diretório raiz onde estão todos os seus repositórios para o site
ROOT_DIR = "C:/Users/Weverton/OneDrive/GitHub"
# Nomes dos arquivos de saída para o sitemap
OUTPUT_XML_FILE = "sitemap.xml"
OUTPUT_TXT_FILE = "sitemap.txt"

# -- Configurações para a API de Indexação do Google (do script Python) --
# Caminho para o arquivo JSON da sua chave de serviço do Google Cloud
CAMINHO_CHAVE_JSON = "indexador-de-site-57bae5ef5fc4.json"
# Escopo necessário para a API de Indexação
SCOPES = ["https://www.googleapis.com/auth/indexing"]
# Endpoint da API de Indexação
API_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish"


def gerar_sitemaps():
    """
    Busca arquivos HTML, valida suas URLs e gera os arquivos sitemap.xml e sitemap.txt.
    Retorna a lista de URLs válidas encontradas.
    """
    print("--- ETAPA A: Buscando arquivos HTML ---")
    
    root_path = Path(ROOT_DIR)
    html_files = list(root_path.rglob("*.html"))

    # Filtra arquivos indesejados (bibliotecas, outputs, READMEs, etc.)
    exclude_patterns = ["site_libs", "output", "renv"]
    html_files = [
        f for f in html_files 
        if not any(part in f.parts for part in exclude_patterns)
        and not f.name.lower() == "readme.html"
        and "WevertonGomesCosta.github.io" not in str(f)
    ]

    print(f"Encontrados {len(html_files)} arquivos HTML relevantes para verificação.\n")
    
    candidate_urls_data = []
    for file_path in html_files:
        # Constrói a URL relativa
        relative_path = file_path.relative_to(root_path)
        # Substitui 'docs' por nada para mapear corretamente para a URL
        # Ex: weverton/docs/index.html -> weverton/index.html
        url_path = "/".join(part for part in relative_path.parts if part != "docs")

        if relative_path.name == "index.html":
            # Para index.html, a URL canônica termina em '/'
            url = f"{BASE_URL}/{relative_path.parent.as_posix().replace('docs', '').strip('/')}/"
            if url.endswith("//"):
                url = url[:-1]
        else:
            url = f"{BASE_URL}/{url_path}"

        # Obtém a data da última modificação
        lastmod = datetime.fromtimestamp(file_path.stat().st_mtime).strftime('%Y-%m-%d')
        candidate_urls_data.append({"loc": url, "lastmod": lastmod})

    print("--- ETAPA B: Verificando a validade das URLs ---")
    valid_url_data = []
    total_urls = len(candidate_urls_data)

    for i, data in enumerate(candidate_urls_data, 1):
        url = data["loc"]
        print(f"[{i}/{total_urls}] Verificando: {url} ... ", end="")
        try:
            response = requests.head(url, timeout=5)
            if response.status_code == 200:
                print("OK (200)")
                valid_url_data.append(data)
            else:
                print(f"ERRO ({response.status_code})")
        except requests.exceptions.RequestException:
            print("FALHA NA CONEXÃO")

    if not valid_url_data:
        print("\nNenhuma URL válida foi encontrada. O processo será encerrado.")
        return []

    print(f"\n--- ETAPA C: Gerando sitemaps com {len(valid_url_data)} URLs válidas ---")
    
    # 1. Gerar sitemap.xml
    print(f"Criando arquivo '{OUTPUT_XML_FILE}'...")
    urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    
    for data in valid_url_data:
        url_element = ET.SubElement(urlset, "url")
        ET.SubElement(url_element, "loc").text = data["loc"]
        ET.SubElement(url_element, "lastmod").text = data["lastmod"]

    # Formata o XML para ser legível (pretty print)
    xml_str = minidom.parseString(ET.tostring(urlset)).toprettyxml(indent="  ")
    with open(OUTPUT_XML_FILE, "w", encoding="utf-8") as f:
        f.write(xml_str)
        
    # 2. Gerar sitemap.txt
    print(f"Criando arquivo '{OUTPUT_TXT_FILE}'...")
    final_urls_txt = [data["loc"] for data in valid_url_data]
    with open(OUTPUT_TXT_FILE, "w") as f:
        f.write("\n".join(final_urls_txt))

    print(f"\n✅ Sitemaps gerados com sucesso!")
    
    return final_urls_txt


def enviar_urls_para_google(urls_para_enviar):
    """
    Autentica com a API do Google e envia a lista de URLs para indexação.
    """
    print("\n--- ETAPA D: Enviando URLs para a API de Indexação do Google ---")
    
    if not urls_para_enviar:
        print("Nenhuma URL para enviar. Pulando esta etapa.")
        return

    print("--- Autenticando com o Google ---")
    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import Request
        
        creds = service_account.Credentials.from_service_account_file(
            CAMINHO_CHAVE_JSON, scopes=SCOPES
        )
        creds.refresh(Request())
        print("Autenticação bem-sucedida.\n")
    except ImportError:
        print("ERRO: As bibliotecas do Google não estão instaladas.")
        print("Execute: pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib")
        return
    except FileNotFoundError:
        print(f"ERRO de autenticação: O arquivo '{CAMINHO_CHAVE_JSON}' não foi encontrado.")
        return
    except Exception as e:
        print(f"ERRO na autenticação: {e}")
        return

    print(f"--- Iniciando o envio de {len(urls_para_enviar)} URLs (Limite da API: ~200/dia) ---")

    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {creds.token}",
        "Content-Type": "application/json"
    })

    for i, url_atual in enumerate(urls_para_enviar, 1):
        print(f"[{i}/{len(urls_para_enviar)}] Enviando: {url_atual} ... ", end="")
        
        body = {"url": url_atual, "type": "URL_UPDATED"}
        
        try:
            response = session.post(API_ENDPOINT, json=body, timeout=10)
            if response.status_code == 200:
                print("OK (Enviado com sucesso)")
            else:
                error_details = response.json()
                error_message = error_details.get('error', {}).get('message', 'Erro desconhecido')
                print(f"ERRO ({response.status_code}): {error_message}")
        except requests.exceptions.RequestException as e:
            print(f"FALHA NA CONEXÃO: {e}")

        # Pausa de 1 segundo para não sobrecarregar a API
        time.sleep(1)

    print("\n✅ Processo de envio para o Google concluído.")


if __name__ == "__main__":
    # Etapa 1: Gerar os sitemaps
    urls_validadas = gerar_sitemaps()
    
    # Etapa 2: Enviar as URLs para o Google
    if urls_validadas:
        enviar_urls_para_google(urls_validadas)
    
    print("\nTodos os processos foram finalizados.")
