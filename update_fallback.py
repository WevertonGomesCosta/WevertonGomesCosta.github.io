# update_fallback_json.py
#
# Descrição:
# Script para buscar dados de várias fontes acadêmicas e de desenvolvimento:
# - GitHub (Repositórios)
# - Google Scholar (via SerpApi)
# - ORCID
# - Scopus (Elsevier API)
# - Web of Science (fallback CSV)
#
# O script combina os dados e gera um arquivo JSON puro para o frontend.
# As chaves e configurações são carregadas de um arquivo 'keys.json' unificado.
# Implementa fallback automático e trata falhas de conexão.
#
# Autor: Weverton Gomes Costa
# Versão: 12.0.0
#   - Correção para Scopus API

import requests
import json
import re
import csv
import math
from datetime import datetime
import sys
import os
import logging
import shutil       # <--- Adicionar
import unicodedata  # <--- Adicionar

# ==============================================================================
# CONFIGURAÇÃO DO LOGGING
# ==============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

# ==============================================================================
# CARREGAMENTO DE CONFIGURAÇÕES
# ==============================================================================
def load_keys(keys_file: str = "keys.json") -> dict:
    """
    Carrega as configurações e chaves de um arquivo JSON.
    Interrompe o script em caso de erro crítico.
    """
    try:
        logging.info(f"Carregando configurações do arquivo '{keys_file}'...")
        with open(keys_file, "r", encoding="utf-8") as f:
            return json.load(f)

    except FileNotFoundError:
        logging.critical(
            f"ERRO CRÍTICO: O arquivo de chaves '{keys_file}' não foi encontrado."
        )
        sys.exit(1)

    except json.JSONDecodeError:
        logging.critical(
            f"ERRO CRÍTICO: O arquivo '{keys_file}' contém um JSON inválido."
        )
        sys.exit(1)


# ==============================================================================
# CARREGAMENTO DAS CHAVES
# ==============================================================================
keys = load_keys()

# ------------------------------------------------------------------------------
# 1. Identidade do autor e fontes principais (CRÍTICAS)
# ------------------------------------------------------------------------------
GITHUB_USERNAME = keys.get("github_username")
SCHOLAR_AUTHOR_ID = keys.get("scholar_author_id")
ORCID_ID = keys.get("orcid_id")

# ------------------------------------------------------------------------------
# 2. Credenciais e tokens (NÃO CRÍTICOS, exceto SerpApi)
# ------------------------------------------------------------------------------
GITHUB_TOKEN = keys.get("github_token")  # Opcional

# SerpApi: permite múltiplas chaves com rotação
SERPAPI_KEYS_RAW = [
    keys.get("serpapi_api_key"),
    keys.get("serpapi_api_key2"),
]

SERPAPI_KEYS = [
    key for key in SERPAPI_KEYS_RAW
    if key and "CHAVE" not in key.upper()
]

# ------------------------------------------------------------------------------
# 3. Métricas acadêmicas adicionais (opcionais / fallback)
# ------------------------------------------------------------------------------
SCOPUS_API_KEY = keys.get("scopus_api_key")
SCOPUS_AUTHOR_ID = keys.get("scopus_author_id")

WOS_API_KEY = keys.get("wos_api_key")
WOS_RESEARCHER_ID = keys.get("wos_researcher_id")

# ------------------------------------------------------------------------------
# 4. Arquivos de saída
# ------------------------------------------------------------------------------
MAIN_FILENAME = "fallback-data.json"
TEMP_FILENAME = "fallback-data-temp.json"

# ==============================================================================
# VALIDAÇÃO DAS CONFIGURAÇÕES
# ==============================================================================

# ---- Validações CRÍTICAS (site não funciona sem isso) -------------------------
if not GITHUB_USERNAME:
    logging.critical("ERRO CRÍTICO: 'github_username' não configurado em keys.json.")
    sys.exit(1)

if not SCHOLAR_AUTHOR_ID:
    logging.critical("ERRO CRÍTICO: 'scholar_author_id' não configurado em keys.json.")
    sys.exit(1)

if not ORCID_ID:
    logging.critical("ERRO CRÍTICO: 'orcid_id' não configurado em keys.json.")
    sys.exit(1)

if not SERPAPI_KEYS:
    logging.critical(
        "ERRO CRÍTICO: Nenhuma chave válida da SerpApi encontrada em keys.json."
    )
    sys.exit(1)

# ---- Validações NÃO CRÍTICAS (fallback ativado) --------------------------------
if not SCOPUS_API_KEY or not SCOPUS_AUTHOR_ID:
    logging.warning(
        "AVISO: Chaves do Scopus não detectadas ou incompletas. "
        "Será utilizado fallback (CSV/manual) quando disponível."
    )

if not WOS_API_KEY or not WOS_RESEARCHER_ID:
    logging.warning(
        "AVISO: Chaves do Web of Science não detectadas ou incompletas. "
        "As métricas do WoS serão ignoradas."
    )

# ==============================================================================
# FUNÇÕES AUXILIARES
# ==============================================================================
def get_year_safe(val):
    """Tenta extrair um ano válido de uma string ou int."""
    try:
        if isinstance(val, int): return val
        match = re.search(r'\d{4}', str(val))
        return int(match.group(0)) if match else 0
    except:
        return 0

def normalize_title(title: str) -> str:
    """
    Normaliza títulos para facilitar matching (Essencial para comparação).
    """
    if not title:
        return ""

    if not isinstance(title, str):
        title = str(title)

    # Remove tags HTML
    clean_title = re.sub(r"<[^>]+>", "", title)

    # Normaliza Unicode (remove acentos)
    clean_title = unicodedata.normalize(
        "NFKD", clean_title
    ).encode("ascii", "ignore").decode("ascii")

    # Remove pontuação (mantém letras, números e espaços)
    clean_title = re.sub(r"[^\w\s]", "", clean_title)

    # Normaliza espaços e caixa
    clean_title = re.sub(r"\s+", " ", clean_title).lower().strip()

    return clean_title


def load_json_data(filepath: str):
    """
    Carrega dados JSON de forma segura.
    Retorna None se o arquivo não existir ou estiver inválido.
    """
    if not filepath or not isinstance(filepath, str):
        logging.error("Caminho inválido para carregamento de JSON.")
        return None

    if not os.path.exists(filepath):
        logging.warning(
            f"Arquivo '{filepath}' não encontrado. Um novo será criado."
        )
        return None

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)

    except json.JSONDecodeError as e:
        logging.error(
            f"JSON inválido em '{filepath}'. "
            f"O arquivo será ignorado para evitar corrupção: {e}"
        )
        return None

    except Exception as e:
        logging.error(
            f"Erro inesperado ao carregar '{filepath}': {e}"
        )
        return None


def calculate_h_index(citations_list) -> int:
    """
    Calcula o índice h a partir de uma lista de citações.
    """
    if not citations_list:
        return 0

    # Remove valores inválidos e garante inteiros
    clean_citations = sorted(
        (int(c) for c in citations_list if c is not None),
        reverse=True
    )

    h = 0
    for i, citations in enumerate(clean_citations, start=1):
        if citations >= i:
            h = i
        else:
            break

    return h


def calculate_i10(citations_list) -> int:
    """
    Calcula o índice i10 (número de publicações com >=10 citações).
    """
    if not citations_list:
        return 0

    return sum(
        1 for c in citations_list
        if c is not None and int(c) >= 10
    )


# ==============================================================================
# FUNÇÕES DE BUSCA DE DADOS - GITHUB
# ==============================================================================

def fetch_github_repos(username: str):
    """
    Busca os repositórios públicos de um usuário no GitHub.
    Retorna lista vazia em caso de falha (não interrompe o pipeline).
    """
    if not username:
        logging.error("Usuário do GitHub não informado.")
        return []

    logging.info("Buscando repositórios do GitHub...")

    api_url = f"https://api.github.com/users/{username}/repos"
    params = {
        "sort": "pushed",
        "per_page": 100
    }

    headers = {
        "Accept": "application/vnd.github.v3+json"
    }

    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"

    try:
        response = requests.get(
            api_url,
            headers=headers,
            params=params,
            timeout=20
        )

        # Rate limit explícito
        if response.status_code == 403:
            reset = response.headers.get("X-RateLimit-Reset")
            if reset:
                reset_time = datetime.fromtimestamp(int(reset))
                logging.error(
                    f"Limite de requisições do GitHub atingido. "
                    f"Reset em {reset_time}."
                )
            else:
                logging.error("Limite de requisições do GitHub atingido (403).")
            return []

        response.raise_for_status()
        repos = response.json()

        if not isinstance(repos, list):
            logging.error("Resposta inesperada da API do GitHub.")
            return []

        formatted_repos = []

        for repo in repos:
            if not isinstance(repo, dict):
                continue

            homepage_url = repo.get("homepage")

            # GitHub Pages fallback
            if not homepage_url and repo.get("has_pages"):
                homepage_url = f"https://{username}.github.io/{repo.get('name', '')}/"

            formatted_repos.append({
                "name": repo.get("name"),
                "html_url": repo.get("html_url"),
                "homepage": homepage_url,
                "description": repo.get("description"),
                "language": repo.get("language"),
                "stargazers_count": repo.get("stargazers_count", 0),
                "forks_count": repo.get("forks_count", 0),
                "updated_at": repo.get("updated_at"),
                "topics": repo.get("topics", [])
            })

        logging.info(f"✓ {len(formatted_repos)} repositórios do GitHub encontrados.")
        return formatted_repos

    except requests.exceptions.Timeout:
        logging.error("Timeout ao conectar à API do GitHub.")
        return []

    except requests.exceptions.RequestException as e:
        logging.error(f"Erro ao buscar repositórios do GitHub: {e}")
        return []


# ==============================================================================
# FUNÇÕES DE BUSCA DE DADOS – GOOGLE SCHOLAR (SerpApi - Com Gráfico Híbrido)
# ==============================================================================

def fetch_scholar_data(author_id: str, api_key: str):
    """
    Busca dados do Google Scholar via SerpApi.
    Retorna estrutura com 'total_publications' e gráfico contendo
    tanto citações quanto número de publicações por ano.
    """
    if not author_id or not api_key:
        logging.warning("Scholar: author_id ou api_key ausente.")
        return None

    logging.info(f"--- Iniciando módulo Google Scholar para ID: {author_id} ---")

    BASE_URL = "https://serpapi.com/search.json"

    # ------------------------------------------------------------------
    # Função auxiliar interna para requests
    # ------------------------------------------------------------------
    def _scholar_request(params):
        try:
            response = requests.get(
                BASE_URL,
                params=params,
                timeout=25
            )
            response.raise_for_status()
            data = response.json()

            if not isinstance(data, dict):
                raise ValueError("Resposta inválida da SerpApi")

            if "error" in data:
                raise RuntimeError(data["error"])

            return data

        except requests.exceptions.Timeout:
            logging.error("Scholar: timeout na SerpApi.")
            return None
        except Exception as e:
            logging.error(f"Scholar: erro na SerpApi: {e}")
            return None

    # ------------------------------------------------------------------
    # 1. PERFIL E HISTÓRICO DE CITAÇÕES
    # ------------------------------------------------------------------
    logging.info("Buscando perfil e métricas do Scholar...")
    
    prof_raw = _scholar_request({
        "engine": "google_scholar_author",
        "author_id": author_id,
        "api_key": api_key,
        "hl": "pt-BR"
    })

    if not prof_raw:
        return None

    cited_by = prof_raw.get("cited_by", {})
    
    # A. Processa Tabela de Métricas
    raw_table = cited_by.get("table", [])
    std_table = []
    key_map = {
        "citations": "citations", "citações": "citations",
        "h_index": "h_index", "índice_h": "h_index",
        "i10_index": "i10_index", "índice_i10": "i10_index"
    }

    for item in raw_table:
        if not isinstance(item, dict): continue
        original_key = list(item.keys())[0]
        clean_key = key_map.get(original_key.lower(), original_key.lower())
        values = item[original_key]
        since_key = next((k for k in values.keys() if k.startswith("since") or k.startswith("desde")), "since_2021")
        
        std_table.append({
            clean_key: {
                "all": values.get("all", 0),
                "since_2021": values.get(since_key, 0)
            }
        })

    # B. Processa Histórico de Citações (base para o gráfico)
    yearly_citation_totals = {}
    raw_graph = cited_by.get("graph", [])
    for p in raw_graph:
        if "year" in p:
            yearly_citation_totals[int(p["year"])] = p.get("citations", 0)

    # ------------------------------------------------------------------
    # 2. LISTA COMPLETA DE ARTIGOS (PAGINAÇÃO)
    # ------------------------------------------------------------------
    logging.info("Buscando lista completa de publicações...")
    all_raw_articles = []
    start = 0
    page_size = 100

    while True:
        page = _scholar_request({
            "engine": "google_scholar_author",
            "author_id": author_id,
            "api_key": api_key,
            "hl": "pt-BR",
            "start": start,
            "num": page_size
        })

        if not page: break
        articles_batch = page.get("articles", [])
        if not articles_batch: break

        all_raw_articles.extend(articles_batch)

        if len(articles_batch) < page_size:
            break
        start += len(articles_batch)

    # ------------------------------------------------------------------
    # 3. NORMALIZAÇÃO E CONTAGEM DE PUBLICAÇÕES POR ANO
    # ------------------------------------------------------------------
    cleaned_articles = []
    yearly_pub_counts = {} # {2020: 5, 2021: 12...}

    for art in all_raw_articles:
        # Extrai ano limpo
        raw_year = art.get("year") or ""
        year_str = str(raw_year).split('/')[0].strip() if raw_year else ""
        
        # Contagem para o gráfico
        if year_str.isdigit():
            y_int = int(year_str)
            yearly_pub_counts[y_int] = yearly_pub_counts.get(y_int, 0) + 1

        # Normaliza Citações
        cites_val = 0
        raw_cites = art.get("cited_by", {})
        if isinstance(raw_cites, dict):
            cites_val = raw_cites.get("value", 0)
        elif isinstance(raw_cites, int):
            cites_val = raw_cites

        cleaned_articles.append({
            "title": art.get("title"),
            "year": year_str,
            "link": art.get("link"),
            "journalTitle": art.get("publication") or "N/A",
            "cited_by": {"value": cites_val},
            "source": "Google Scholar",
            "doi": None, 
            "doiLink": None 
        })

    logging.info(f"✓ {len(cleaned_articles)} publicações do Scholar encontradas.")

    # ------------------------------------------------------------------
    # 4. MONTAGEM DO GRÁFICO FINAL (CITAÇÕES + PUBLICAÇÕES)
    # ------------------------------------------------------------------
    graph_data = []
    
    # Pega todos os anos únicos que aparecem em citações OU publicações
    all_years = sorted(set(yearly_citation_totals.keys()) | set(yearly_pub_counts.keys()))
    
    current_year = datetime.now().year
    
    for y in all_years:
        # Filtro básico para evitar sujeira de anos futuros ou muito antigos
        if y <= current_year + 1:
            graph_data.append({
                "year": y,
                "citations": yearly_citation_totals.get(y, 0),
                "publications": yearly_pub_counts.get(y, 0) # <--- Dado crucial adicionado
            })

    # ------------------------------------------------------------------
    # 5. RETORNO FINAL
    # ------------------------------------------------------------------
    return {
        "profile": {
            "source": "Google Scholar",
            "source_name": "Google Scholar",
            "total_publications": len(cleaned_articles), # <--- Contagem total explícita
            "cited_by": {
                "table": std_table,
                "graph": graph_data
            }
        },
        "articles": cleaned_articles
    }


# ==============================================================================
# FUNÇÕES DE BUSCA DE DADOS – ORCID
# ==============================================================================
def fetch_orcid_works(orcid_id):
    """Busca as publicações de um perfil ORCID com verificação rigorosa de nulos."""
    logging.info("Buscando publicações do ORCID...")
    api_url = f"https://pub.orcid.org/v3.0/{orcid_id}/works"
    headers = {"Accept": "application/json"}

    try:
        response = requests.get(api_url, headers=headers, timeout=20)
        response.raise_for_status()
        data = response.json()
        
        orcid_works = []
        for group in data.get("group", []):
            if not group: continue
            
            summaries = group.get("work-summary")
            if not summaries: continue
            
            summary = summaries[0]
            if not summary: continue

            # --- PROTEÇÃO EXTRA AQUI ---
            # O erro acontecia porque summary.get("title") retornava None
            title_obj = summary.get("title")
            if not title_obj: continue 
            
            title_val = title_obj.get("title")
            if not title_val: continue
            
            title = title_val.get("value")
            if not title: continue
            # ---------------------------

            # Extração de DOI
            doi = None
            doi_link = None
            external_ids = summary.get("external-ids", {})
            # Proteção caso external-ids seja None
            if external_ids:
                for ext in external_ids.get("external-id", []):
                    if ext.get("external-id-type") == "doi":
                        doi = ext.get("external-id-value")
                        doi_url = ext.get("external-id-url")
                        doi_link = doi_url.get("value") if doi_url else None
                        break
            
            year = None
            pub_date = summary.get("publication-date")
            if pub_date and pub_date.get("year"):
                year = pub_date["year"].get("value")
                
            journal_obj = summary.get("journal-title")
            journal = journal_obj.get("value", "N/A") if journal_obj else "N/A"
            
            link_obj = summary.get("url")
            link = link_obj.get("value") if link_obj else None

            orcid_works.append({
                "title": title,
                "doi": doi,
                "doiLink": doi_link or (f"https://doi.org/{doi}" if doi else None),
                "year": year,
                "journalTitle": journal,
                "link": link,
                "source": "ORCID"
            })

        logging.info(f"✓ {len(orcid_works)} publicações encontradas no ORCID.")
        return orcid_works

    except Exception as e:
        # Loga o erro mas retorna lista vazia para não travar o script
        logging.error(f"Erro ao buscar dados do ORCID: {e}")
        return []

# ==============================================================================
# FUNÇÕES DE BUSCA DE DADOS – SCOPUS (Versão Final Validada)
# ==============================================================================
def fetch_scopus_data(author_id, api_key):
    """
    Busca dados do Scopus via Elsevier API.
    Gera gráfico de citações somando o histórico anual de TODOS os artigos.
    """
    if not author_id or not api_key:
        return None

    logging.info(f"--- [Scopus] Iniciando módulo Scopus para ID: {author_id} ---")

    headers = {
        "X-ELS-APIKey": api_key,
        "Accept": "application/json"
    }

    cleaned_articles = []
    scopus_ids_list = []
    
    # Acumuladores globais
    yearly_citation_totals = {} # Soma de citações de todos os artigos por ano
    yearly_pub_counts = {}      # Contagem de publicações por ano

    # ==========================================================================
    # 1. LISTA DE ARTIGOS (Search API)
    # ==========================================================================
    start_index = 0
    items_per_page = 25
    has_more_items = True

    while has_more_items:
        try:
            resp = requests.get(
                "https://api.elsevier.com/content/search/scopus",
                headers=headers,
                params={
                    "query": f"AU-ID({author_id})",
                    "count": items_per_page,
                    "start": start_index,
                    "view": "STANDARD",
                    "sort": "-citedby-count"
                },
                timeout=20
            )

            if resp.status_code != 200:
                break

            data = resp.json().get("search-results", {})
            entries = data.get("entry", [])
            
            if not entries: break

            for entry in entries:
                # ID
                raw_sid = entry.get("dc:identifier", "")
                clean_sid = raw_sid.replace("SCOPUS_ID:", "").strip()
                if clean_sid:
                    scopus_ids_list.append(clean_sid)

                # Ano de Publicação
                raw_date = entry.get("prism:coverDate") or ""
                pub_year_str = raw_date[:4] if len(raw_date) >= 4 else ""
                if pub_year_str.isdigit():
                    y_int = int(pub_year_str)
                    yearly_pub_counts[y_int] = yearly_pub_counts.get(y_int, 0) + 1

                # Dados do Artigo
                cited_total = int(entry.get("citedby-count", 0))
                doi = entry.get("prism:doi")

                cleaned_articles.append({
                    "title": entry.get("dc:title"),
                    "year": pub_year_str,
                    "journalTitle": entry.get("prism:publicationName", "N/A"),
                    "doi": doi,
                    "link": f"https://doi.org/{doi}" if doi else None,
                    "cited_by": {"value": cited_total}, 
                    "source": "Scopus",
                    "scopus_id": clean_sid 
                })

            start_index += len(entries)
            total_results = int(data.get("opensearch:totalResults", 0))
            has_more_items = start_index < total_results

        except Exception as e:
            logging.error(f"Erro Scopus Search: {e}")
            break

    # ==========================================================================
    # 2. HISTÓRICO DE CITAÇÕES (Soma acumulativa)
    # ==========================================================================
    if scopus_ids_list:
        try:
            # Configuração de data (Range amplo para cobrir todo histórico)
            START_YEAR = 2010 
            current_year = datetime.now().year
            date_range_str = f"{START_YEAR}-{current_year + 1}"
            
            base_url = "https://api.elsevier.com/content/abstract/citations"
            
            # Divide em lotes de 20 (limite da API)
            batch_size = 20
            batches = [scopus_ids_list[i:i + batch_size] for i in range(0, len(scopus_ids_list), batch_size)]

            for batch in batches:
                ids_str = ",".join(batch)
                manual_url = f"{base_url}?scopus_id={ids_str}&date={date_range_str}&apiKey={api_key}&httpAccept=application/json"
                
                try:
                    resp = requests.get(manual_url, headers={}, timeout=25)
                    if resp.status_code == 200:
                        data = resp.json()
                        root = data.get("abstract-citations-response") or data.get("citation-overview") or {}
                        matrix_root = root.get("citeInfoMatrix", {}).get("citeInfoMatrixXML", {}).get("citationMatrix", {})
                        cite_info_list = matrix_root.get("citeInfo", [])
                        
                        if isinstance(cite_info_list, dict): cite_info_list = [cite_info_list]

                        # Loop de SOMA
                        for article_data in cite_info_list:
                            cc_list = article_data.get("cc", [])
                            if isinstance(cc_list, dict): cc_list = [cc_list]
                            
                            for idx, item in enumerate(cc_list):
                                try:
                                    val = int(item.get("$", "0"))
                                    year_mapped = START_YEAR + idx
                                    
                                    if val > 0 and year_mapped <= current_year + 1:
                                        yearly_citation_totals[year_mapped] = yearly_citation_totals.get(year_mapped, 0) + val
                                except: pass
                except Exception:
                    pass

        except Exception as e:
            logging.error(f"Erro Scopus Citations: {e}")

    # ==========================================================================
    # 3. FORMATAÇÃO FINAL
    # ==========================================================================
    
    # Totais
    total_cites_all = sum(a["cited_by"]["value"] for a in cleaned_articles)
    
    # Since 2021 (Baseado no gráfico somado, que é mais preciso)
    since_2021_sum = sum(v for k, v in yearly_citation_totals.items() if k >= 2021)
    
    # Filtro para índices (artigos recentes)
    recent_cites = [a["cited_by"]["value"] for a in cleaned_articles if a["year"].isdigit() and int(a["year"]) >= 2021]

    metrics_table = [
        {"citations": {"all": total_cites_all, "since_2021": since_2021_sum}},
        {"h_index": {
            "all": calculate_h_index([a["cited_by"]["value"] for a in cleaned_articles]), 
            "since_2021": calculate_h_index(recent_cites)
        }},
        {"i10_index": {
            "all": calculate_i10([a["cited_by"]["value"] for a in cleaned_articles]), 
            "since_2021": calculate_i10(recent_cites)
        }}
    ]

    # Montagem do Gráfico
    graph_data = []
    all_years = sorted(set(yearly_pub_counts.keys()) | set(yearly_citation_totals.keys()))
    
    for y in all_years:
        if 2010 <= y <= datetime.now().year + 1: # Filtro visual
            graph_data.append({
                "year": y,
                "citations": yearly_citation_totals.get(y, 0),
                "publications": yearly_pub_counts.get(y, 0)
            })

    return {
        "source_name": "Scopus",
        "profile": {
            "total_publications": len(cleaned_articles),
            "cited_by": {
                "table": metrics_table,
                "graph": graph_data
            }
        },
        "articles": cleaned_articles
    }

# ==============================================================================
# FUNÇÕES DE BUSCA DE DADOS – WEB OF SCIENCE
# ==============================================================================

def fetch_wos_data(researcher_id, api_key):
    logging.info(f"--- Iniciando módulo Web of Science para ID: {researcher_id} ---")

    articles = []
    
    # Acumuladores Globais para o Gráfico
    yearly_citation_totals = {} 
    yearly_pub_counts = {}
    
    # Lista auxiliar para calcular métricas "Since 2021"
    # Cada item será o total de citações recentes de um artigo específico
    recent_citations_per_article = [] 
    
    api_success = False

    # ==========================================================================
    # TENTATIVA 1 e 2: APIs (Expanded → Lite)
    # ==========================================================================
    if api_key:
        headers = {"X-ApiKey": api_key, "Accept": "application/json"}

        # ----------------------------------------------------------------------
        # A) WoS Expanded (com paginação)
        # ----------------------------------------------------------------------
        try:
            logging.info("Tentando WoS API Expanded...")
            start = 1
            count = 50

            while True:
                params = {
                    "databaseId": "WOS",
                    "usrQuery": f"AI=({researcher_id})",
                    "count": count,
                    "firstRecord": start
                }

                resp = requests.get(
                    "https://api.clarivate.com/api/wos/search",
                    headers=headers,
                    params=params,
                    timeout=20
                )

                if resp.status_code == 200:
                    data = resp.json()
                    records = (
                        data.get("Data", {})
                        .get("Records", {})
                        .get("records", [])
                    )

                    if not records:
                        break

                    for r in records:
                        static = r.get("static_data", {})
                        dynamic = r.get("dynamic_data", {})

                        title = (
                            static.get("summary", {})
                            .get("titles", {})
                            .get("title", [{}])[0]
                            .get("content", "")
                        )

                        year = str(
                            static.get("summary", {})
                            .get("pub_info", {})
                            .get("pubyear", "")
                        )

                        cites = int(
                            dynamic.get("citation_related", {})
                            .get("tc_list", {})
                            .get("silo_tc", {})
                            .get("local_count", 0)
                        )

                        doi = None
                        for id_obj in (
                            dynamic.get("cluster_related", {})
                            .get("identifiers", {})
                            .get("identifier", [])
                        ):
                            if id_obj.get("type") == "doi":
                                doi = id_obj.get("value")
                                break

                        articles.append({
                            "title": title or "Untitled",
                            "year": year,
                            "doi": doi,
                            "link": f"https://doi.org/{doi}" if doi else None,
                            "cited_by": {"value": cites},
                            "source": "Web of Science"
                        })
                        
                        # Nota: A API Expanded requer lógica complexa para histórico anual.
                        # Focaremos a correção principal no fallback local conforme solicitado.

                    start += len(records)
                    if len(records) < count:
                        break

                    api_success = True

                elif resp.status_code in [401, 403, 404]:
                    logging.warning("WoS Expanded não autorizado.")
                    break
                else:
                    logging.warning(f"WoS Expanded falhou ({resp.status_code}).")
                    break

            if api_success:
                logging.info("✓ Dados obtidos via WoS API Expanded.")

        except Exception as e:
            logging.error(f"Erro WoS Expanded: {e}")

        # ----------------------------------------------------------------------
        # B) WoS Lite (se Expanded falhou)
        # ----------------------------------------------------------------------
        if not api_success:
            try:
                logging.info("Tentando WoS API Lite...")
                start = 1
                count = 100

                while True:
                    params = {
                        "databaseId": "WOS",
                        "usrQuery": f"AI=({researcher_id})",
                        "count": count,
                        "firstRecord": start
                    }

                    resp = requests.get(
                        "https://api.clarivate.com/api/woslite/search",
                        headers=headers,
                        params=params,
                        timeout=20
                    )

                    if resp.status_code != 200:
                        logging.warning(f"WoS Lite falhou ({resp.status_code}).")
                        break

                    data = resp.json()
                    records = data.get("Data", [])
                    if not records:
                        break

                    for r in records:
                        title = r.get("title", {}).get("value", [""])[0]
                        cites = int(r.get("other", {}).get("timesCited", 0))
                        doi = r.get("other", {}).get("identifier_doi", [None])[0]
                        year = str(
                            r.get("source", [{}])[0]
                            .get("publishYear", "")
                        )

                        articles.append({
                            "title": title,
                            "year": year,
                            "doi": doi,
                            "link": f"https://doi.org/{doi}" if doi else None,
                            "cited_by": {"value": cites},
                            "source": "Web of Science"
                        })

                    start += len(records)
                    if len(records) < count:
                        break

                if articles:
                    api_success = True
                    logging.info("✓ Dados obtidos via WoS API Lite.")

            except Exception as e:
                logging.error(f"Erro WoS Lite: {e}")

    # ==========================================================================
    # TENTATIVA 3: FALLBACK LOCAL (savedrecs.txt)
    # ==========================================================================
    if not api_success:
        txt_file = "savedrecs.txt"
        if os.path.exists(txt_file):
            logging.info("Lendo fallback local: savedrecs.txt")
            try:
                # 1. Detecta cabeçalho e delimitador
                delimiter = '\t' 
                header_pos = 0
                
                with open(txt_file, 'r', encoding='utf-8-sig', errors='replace') as f:
                    lines = [f.readline() for _ in range(10)]
                    for i, line in enumerate(lines):
                        if "Title" in line and "Authors" in line:
                            header_pos = i
                            if '","' in line or ',"' in line: delimiter = ','
                            break
                
                # 2. Processa os dados
                with open(txt_file, 'r', encoding='utf-8-sig', errors='replace') as f:
                    for _ in range(header_pos): next(f) # Pula metadados
                    
                    reader = csv.DictReader(f, delimiter=delimiter)
                    
                    for row in reader:
                        title = row.get("Title") or row.get("Article Title")
                        if not title: continue 

                        doi = row.get("DOI", "")
                        year_str = row.get("Publication Year", "")
                        
                        # Citações Totais (All Time)
                        raw_cites = row.get("Times Cited, WoS Core") or row.get("Total Citations") or "0"
                        try:
                            cites_all_time = int(raw_cites.replace(',', '').strip())
                        except:
                            cites_all_time = 0

                        # Adiciona Artigo
                        articles.append({
                            "title": title,
                            "year": year_str,
                            "doi": doi,
                            "link": f"https://doi.org/{doi}" if doi else None,
                            "cited_by": {"value": cites_all_time},
                            "source": "Web of Science"
                        })

                        # --- LÓGICA DE GRÁFICO E MÉTRICAS RECENTES ---
                        
                        # 1. Publicações por Ano (Gráfico)
                        if year_str and year_str.isdigit():
                            y_int = int(year_str)
                            yearly_pub_counts[y_int] = yearly_pub_counts.get(y_int, 0) + 1

                        # 2. Iterar colunas para Citações (Gráfico + Since 2021)
                        cites_recent_for_this_article = 0
                        
                        for key, val in row.items():
                            # Se a coluna é um ano (ex: "2021")
                            if key and key.isdigit() and len(key) == 4:
                                try:
                                    c_year = int(key)
                                    c_val = int(val) if val and val.strip() else 0
                                    
                                    if c_val > 0:
                                        # A) Soma ao gráfico global
                                        yearly_citation_totals[c_year] = yearly_citation_totals.get(c_year, 0) + c_val
                                        
                                        # B) Se for >= 2021, conta como recente para este artigo
                                        if c_year >= 2021:
                                            cites_recent_for_this_article += c_val
                                except:
                                    continue
                        
                        # Guarda o total recente deste artigo para calcular H-index/i10 depois
                        recent_citations_per_article.append(cites_recent_for_this_article)

                logging.info(f"✓ WoS Local: {len(articles)} artigos processados.")

            except Exception as e:
                logging.error(f"Erro crítico ao ler savedrecs.txt: {e}")

    if not articles:
        return None

    # ==========================================================================
    # CÁLCULO DE MÉTRICAS (ALL vs SINCE 2021)
    # ==========================================================================
    # Lista de todas as citações (All Time)
    cites_vals_all = [a["cited_by"]["value"] for a in articles]
    
    # Já temos a lista de citações recentes populada no loop acima:
    # recent_citations_per_article
    
    metrics = [
        {
            "citations": {
                "all": sum(cites_vals_all), 
                "since_2021": sum(recent_citations_per_article) # Soma das listas recentes
            }
        },
        {
            "h_index": {
                "all": calculate_h_index(cites_vals_all), 
                "since_2021": calculate_h_index(recent_citations_per_article) # H-index da lista recente
            }
        },
        {
            "i10_index": {
                "all": calculate_i10(cites_vals_all), 
                "since_2021": calculate_i10(recent_citations_per_article) # i10 da lista recente
            }
        }
    ]

    # ==========================================================================
    # MONTAGEM DO GRÁFICO
    # ==========================================================================
    graph_data = []
    all_years = sorted(set(yearly_citation_totals.keys()) | set(yearly_pub_counts.keys()))
    current_year = datetime.now().year

    for y in all_years:
        if 1990 <= y <= current_year + 1:
            c_count = yearly_citation_totals.get(y, 0)
            p_count = yearly_pub_counts.get(y, 0)
            
            if c_count > 0 or p_count > 0:
                graph_data.append({
                    "year": y,
                    "citations": c_count,
                    "publications": p_count
                })

    return {
        "profile": {
            "source_name": "Web of Science",
            "total_publications": len(articles),
            "cited_by": {
                "table": metrics,
                "graph": graph_data
            }
        },
        "articles": articles
    }

# ==============================================================================
# FUNÇÃO DE COMPARAÇÃO E GERAÇÃO DE RELATÓRIO (COM MATCHING DE ARTIGOS)
# ==============================================================================
def analyze_changes(old_data, new_data):
    """
    Compara dados antigos e novos e gera relatório textual detalhado.
    Usa normalize_title para encontrar correspondências de artigos.
    """

    if old_data is None:
        return (["  [!] Arquivo de dados antigo não encontrado (Primeira execução)."], ["initial_generation"])

    report_lines = []
    modification_notes = []

    # --- Helper para chaves de artigos ---
    def get_art_key(a):
        # Prioridade absoluta para DOI
        if a.get("doi"):
            return f"doi:{str(a['doi']).lower().strip()}"
        # Fallback para Título Normalizado + Ano
        title = normalize_title(a.get("title"))
        year = str(a.get("year", "")).strip()
        return f"{title}_{year}"

    # --- Helper para extrair valor numérico ---
    def force_int(val):
        try:
            if val is None: return 0
            if isinstance(val, dict): return int(float(val.get("value", 0)))
            return int(float(val))
        except (ValueError, TypeError):
            return 0

    # 1. Comparação do GitHub
    old_repos = {r.get("name") for r in old_data.get("githubRepos", []) if r.get("name")}
    new_repos = {r.get("name") for r in new_data.get("githubRepos", []) if r.get("name")}
    added_repos = new_repos - old_repos
    if added_repos:
        report_lines.append(f"  [+] GitHub: {len(added_repos)} repositórios adicionados.")

    # 2. Comparação Detalhada por Fonte Acadêmica
    # Vamos olhar dentro de cada fonte para ver novos artigos ou mudanças de citação
    sources_to_check = [
        ("google_scholar", "Scholar"),
        ("scopus", "Scopus"),
        ("web_of_science", "WoS")
    ]

    for source_key, label in sources_to_check:
        # Pega as listas de artigos antiga e nova
        old_list = old_data.get("academicData", {}).get(source_key, {}).get("articles", [])
        new_list = new_data.get("academicData", {}).get(source_key, {}).get("articles", [])

        # Se for fallback do Scholar antigo
        if not old_list and source_key == "google_scholar":
            old_list = old_data.get("scholarData", {}).get("articles", [])

        if not new_list and not old_list:
            continue

        # Cria mapas {chave: artigo} para comparação rápida
        old_map = {get_art_key(a): a for a in old_list}
        new_map = {get_art_key(a): a for a in new_list}

        # Verifica artigos ADICIONADOS
        added_keys = set(new_map.keys()) - set(old_map.keys())
        if added_keys:
            report_lines.append(f"  [+] {label}: {len(added_keys)} novos artigos encontrados.")
            # Opcional: Listar os títulos dos novos
            for k in list(added_keys)[:3]: # Mostra apenas os 3 primeiros
                title = new_map[k].get("title", "Sem título")
                report_lines.append(f"      - {title[:60]}...")

        # Verifica MUDANÇA DE CITAÇÕES em artigos existentes
        citation_changes = 0
        citation_diff_total = 0
        
        for k, new_art in new_map.items():
            if k in old_map:
                old_art = old_map[k]
                
                # Normaliza a leitura das citações (pode ser int ou dict {'value': int})
                c_new = force_int(new_art.get("cited_by"))
                c_old = force_int(old_art.get("cited_by"))
                
                if c_new > c_old:
                    citation_changes += 1
                    diff = c_new - c_old
                    citation_diff_total += diff
                    
                    # Se quiser muito detalhe, descomente a linha abaixo:
                    # report_lines.append(f"      * {new_art.get('title')[:30]}...: {c_old} -> {c_new}")

        if citation_changes > 0:
            report_lines.append(f"  [*] {label}: {citation_changes} artigos receberam novas citações (Total: +{citation_diff_total}).")

    return report_lines, modification_notes

# ==============================================================================
# FUNÇÕES DE GERAÇÃO E ATUALIZAÇÃO DE ARQUIVOS (MANTIDAS COMO PEDIDO)
# ==============================================================================
def generate_fallback_file(data, filename):
    """
    Gera o arquivo JSON de forma atômica.
    Escreve primeiro em '<filename>.writing' e depois substitui o arquivo final.
    """
    logging.info(f"Gerando o arquivo '{filename}'...")
    temp_writing_filename = f"{filename}.writing"

    try:
        with open(temp_writing_filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            f.flush()
            os.fsync(f.fileno())

        os.replace(temp_writing_filename, filename)
        logging.info(f"✓ Arquivo '{filename}' gerado com sucesso.")
        return True

    except Exception as e:
        logging.error(f"Erro ao gerar JSON em '{filename}': {e}")
        return False

    finally:
        if os.path.exists(temp_writing_filename):
            try:
                os.remove(temp_writing_filename)
            except OSError:
                pass

def update_main_file(main_file, temp_file):
    """
    Atualiza o arquivo principal a partir de um temporário.
    """
    if not os.path.exists(temp_file):
        logging.error(f"Arquivo temporário '{temp_file}' não encontrado.")
        return False

    try:
        shutil.move(temp_file, main_file)
        logging.info(f"✓ Arquivo principal '{main_file}' atualizado com sucesso.")
        return True

    except Exception as e:
        logging.error(f"Erro crítico ao atualizar '{main_file}': {e}")
        if os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except OSError:
                pass
        return False

# ==============================================================================
# EXECUÇÃO PRINCIPAL (LIMPA E OTIMIZADA)
# ==============================================================================
if __name__ == "__main__":
    logging.info("--- Iniciando atualização de dados acadêmicos ---")

    # 1. Carregar dados antigos para comparação
    old_data = load_json_data(MAIN_FILENAME)

    # 2. Coleta de Dados
    logging.info("--- Etapa 1: Coleta de Dados ---")
    
    github_repos = fetch_github_repos(GITHUB_USERNAME)

    # Scholar (com rotação de chaves)
    scholar_data = None
    for api_key in SERPAPI_KEYS:
        scholar_data = fetch_scholar_data(SCHOLAR_AUTHOR_ID, api_key)
        if scholar_data: break
    
    # Scopus, WoS, ORCID
    scopus_data = fetch_scopus_data(SCOPUS_AUTHOR_ID, SCOPUS_API_KEY) if SCOPUS_API_KEY and SCOPUS_AUTHOR_ID else None
    wos_data = fetch_wos_data(WOS_RESEARCHER_ID, WOS_API_KEY) if WOS_RESEARCHER_ID else None
    
    # Tratamento específico para ORCID (lista ou dict)
    orcid_raw = fetch_orcid_works(ORCID_ID) if ORCID_ID else []
    if isinstance(orcid_raw, dict):
         orcid_list = orcid_raw.get("articles", [])
         # Se a função retornar perfil completo, ajustamos aqui
    else:
         orcid_list = orcid_raw

    # 3. Montagem do JSON Final (Sem Merge/Maximization)
    logging.info("--- Etapa 2: Montagem do JSON Final ---")

    new_data = {
        "githubRepos": github_repos,
        "lastUpdated": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "academicData": {
            "google_scholar": scholar_data,
            "scopus": scopus_data,
            "web_of_science": wos_data,
            "orcid": {
                "source_name": "ORCID",
                "articles": orcid_list
            }
            # "maximized" foi removido conforme solicitado
        }
    }

    # 4. Análise de Mudanças e Persistência
    logging.info("--- Etapa 3: Análise de Mudanças ---")
    
    # Chama a função adaptada
    report_lines, _ = analyze_changes(old_data, new_data)

    if report_lines:
        print("\n" + "=" * 60)
        print(" RELATÓRIO DE ATUALIZAÇÃO")
        print("=" * 60)
        for line in report_lines: print(line)
        print("=" * 60 + "\n")
        
        logging.info("Mudanças identificadas. Gerando e atualizando arquivo...")
        
        # Gera no temporário e move para o principal
        if generate_fallback_file(new_data, TEMP_FILENAME):
            _ = update_main_file(MAIN_FILENAME, TEMP_FILENAME)
            
    else:
        print("\n=== Nenhuma alteração relevante detectada. Mantendo versão anterior. ===\n")
        logging.info("Nenhuma mudança nos dados. O arquivo principal será mantido.")
        
        # Limpeza do temporário se existir
        if os.path.exists(TEMP_FILENAME):
            try:
                os.remove(TEMP_FILENAME)
                logging.info(f"Limpeza: Arquivo temporário {TEMP_FILENAME} excluído.")
            except Exception as e:
                logging.warning(f"Erro ao excluir arquivo temporário: {e}")

    logging.info("--- Processo concluído ---")
