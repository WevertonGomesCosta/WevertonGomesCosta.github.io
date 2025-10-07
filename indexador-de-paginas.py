import time
import json
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

# --- 1. Configurações ---
# Coloque o caminho para o arquivo JSON que você baixou do Google Cloud
CAMINHO_CHAVE_JSON = "indexador-de-site-57bae5ef5fc4.json"

# Nome do arquivo de texto com a lista de URLs
SITEMAP_TXT_FILE = "sitemap.txt"

# Escopo necessário para a API de Indexação
SCOPES = ["https://www.googleapis.com/auth/indexing"]

# Endpoint da API de Indexação
API_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish"


def main():
    """
    Função principal que autentica, lê as URLs e as envia para a API de Indexação.
    """
    print("--- Autenticando com o Google ---")
    try:
        # Autentica usando o arquivo de chave de serviço
        creds = service_account.Credentials.from_service_account_file(
            CAMINHO_CHAVE_JSON, scopes=SCOPES
        )
        creds.refresh(Request())
        print("Autenticação bem-sucedida.\n")
    except Exception as e:
        print(f"ERRO na autenticação: {e}")
        print("Verifique se o caminho para o arquivo JSON está correto.")
        return

    try:
        print(f"--- Lendo URLs do arquivo: {SITEMAP_TXT_FILE} ---")
        with open(SITEMAP_TXT_FILE, "r") as f:
            urls_para_enviar = [line.strip() for line in f if line.strip()]
        print(f"Encontradas {len(urls_para_enviar)} URLs para enviar.\n")
    except FileNotFoundError:
        print(f"ERRO: O arquivo '{SITEMAP_TXT_FILE}' não foi encontrado.")
        return

    print(f"--- Iniciando o envio de {len(urls_para_enviar)} URLs (Limite da API: ~200/dia) ---")

    # Cria uma sessão de requests que usará a autenticação
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {creds.token}",
        "Content-Type": "application/json"
    })

    for i, url_atual in enumerate(urls_para_enviar, 1):
        print(f"[{i}/{len(urls_para_enviar)}] Enviando: {url_atual} ... ", end="")
        
        # Corpo da requisição no formato JSON
        body = {
            "url": url_atual,
            "type": "URL_UPDATED"
        }
        
        try:
            response = session.post(API_ENDPOINT, json=body, timeout=10)
            
            if response.status_code == 200:
                print("OK (Enviado com sucesso)")
            else:
                error_details = response.json()
                print(f"ERRO ({response.status_code}): {error_details.get('error', {}).get('message', 'Erro desconhecido')}")

        except requests.exceptions.RequestException as e:
            print(f"FALHA NA CONEXÃO: {e}")

        # Pausa de 1 segundo para não sobrecarregar a API
        time.sleep(1)

    print("\n✅ Processo de envio concluído.")


if __name__ == "__main__":
    main()
