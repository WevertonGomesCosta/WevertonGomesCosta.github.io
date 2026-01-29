# update_fallback_json.py
#
# Descrição:
# Script para buscar dados de várias fontes acadêmicas e de desenvolvimento:
# - GitHub (Repositórios)
# - Google Scholar (via SerpApi)
# - ORCID
# - Scopus (Elsevier API + fallback CSV)
# - Web of Science (Clarivate API)
#
# O script combina os dados e gera um arquivo JSON puro para o frontend.
# As chaves e configurações são carregadas de um arquivo 'keys.json' unificado.
# Implementa fallback automático e trata falhas de conexão.
#
# Autor: Weverton Gomes Costa
# Versão: 11.0.0
#   - Base estável
#   - Preparação para Scopus híbrido (API + Citation Overview manual)
#   - Melhorias de validação e robustez

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
    Normaliza títulos para facilitar matching entre fontes diferentes
    (ORCID, Scholar, Scopus, WoS).

    Etapas:
    - Remove HTML
    - Remove acentos
    - Remove pontuação
    - Normaliza espaços
    - Converte para lowercase
    """
    if not title:
        return ""

    # Garante que seja string
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
# FUNÇÕES DE BUSCA DE DADOS – SCOPUS
# ==============================================================================

def fetch_scopus_data(author_id, api_key):
    if not author_id or not api_key:
        return None

    logging.info(f"--- Iniciando módulo Scopus para ID: {author_id} ---")

    headers = {
        "X-ELS-APIKey": api_key,
        "Accept": "application/json"
    }

    articles = []
    scopus_ids = []
    yearly_citation_totals = {} 
    yearly_pub_counts = {}

    # ==========================================================================
    # PASSO 1: SEARCH API
    # ==========================================================================
    logging.info("Buscando artigos via Scopus Search API...")
    start = 0
    count = 25
    more = True

    while more:
        params = {
            "query": f"AU-ID({author_id})",
            "count": count,
            "start": start,
            "view": "STANDARD", # STANDARD geralmente contém dc:identifier
            "sort": "-citedby-count"
        }

        try:
            resp = requests.get(
                "https://api.elsevier.com/content/search/scopus",
                headers=headers,
                params=params,
                timeout=20
            )

            if resp.status_code != 200:
                logging.warning(f"Search API falhou ({resp.status_code}).")
                break

            entries = resp.json().get("search-results", {}).get("entry", [])
            if not entries:
                break

            for entry in entries:
                # CORREÇÃO: Limpeza rigorosa do ID
                raw_sid = entry.get("dc:identifier", "")
                sid = raw_sid.replace("SCOPUS_ID:", "").strip()
                
                # Só adiciona se tiver ID e for numérico (evita lixo)
                if sid and sid.isdigit():
                    scopus_ids.append(sid)
                
                doi = entry.get("prism:doi")
                raw_date = entry.get("prism:coverDate") or ""
                year = raw_date[:4] if len(raw_date) >= 4 else ""

                if year.isdigit():
                    y_int = int(year)
                    yearly_pub_counts[y_int] = yearly_pub_counts.get(y_int, 0) + 1

                articles.append({
                    "title": entry.get("dc:title"),
                    "year": year,
                    "journalTitle": entry.get("prism:publicationName", "N/A"),
                    "doi": doi,
                    "link": f"https://doi.org/{doi}" if doi else None,
                    "cited_by": {"value": int(entry.get("citedby-count", 0))},
                    "source": "Scopus"
                })

            start += len(entries)
            more = len(entries) == count

        except Exception as e:
            logging.error(f"Erro Search API: {e}")
            break

    logging.info(f"✓ {len(articles)} artigos recuperados. {len(scopus_ids)} IDs válidos para histórico.")

    # ==========================================================================
    # PASSO 2: CITATION OVERVIEW API
    # ==========================================================================
    api_overview_success = False

    if scopus_ids:
        try:
            logging.info("Tentando Citation Overview API...")
            
            batch_size = 20
            curr_year = datetime.now().year
            start_year = 2017
            date_range = f"{start_year}-{curr_year}"
            
            overview_failed = False 
            
            for i in range(0, len(scopus_ids), batch_size):
                batch = scopus_ids[i : i + batch_size]
                if not batch: continue

                ids_chunk = ",".join(batch)
                
                # DEBUG CRÍTICO: Mostra o que estamos enviando
                logging.info(f"Enviando Batch {i//batch_size + 1}: IDs={ids_chunk[:20]}... (Total: {len(batch)})")
                
                params_over = {
                    "scopus_id": ids_chunk, # O parametro deve ser exatamente este
                    "date": date_range,
                    "httpAccept": "application/json"
                }

                ov_resp = requests.get(
                    "https://api.elsevier.com/content/abstract/citation-overview",
                    headers=headers,
                    params=params_over,
                    timeout=20
                )

                if ov_resp.status_code == 200:
                    data = ov_resp.json()
                    overview_base = data.get("citation-overview", {})
                    docs = overview_base.get("document", [])
                    if isinstance(docs, dict): docs = [docs]

                    for doc in docs:
                        matrix = (
                            doc.get("citeInfoMatrix", {})
                            .get("citeInfoMatrixXML", {})
                            .get("citationMatrix", {})
                            .get("citeInfo", [])
                        )
                        for col in matrix:
                            y = col.get("dc:coverage-text") or col.get("@year")
                            v = col.get("$")
                            if y and v:
                                try:
                                    yearly_citation_totals[int(y)] = yearly_citation_totals.get(int(y), 0) + int(v)
                                except: pass
                else:
                    logging.warning(f"Batch falhou ({ov_resp.status_code}).")
                    if ov_resp.status_code == 400:
                        logging.error(f"ERRO 400 RETORNO: {ov_resp.text}")
                    overview_failed = True
                    break 
            
            if not overview_failed:
                api_overview_success = True
                logging.info("✓ Histórico de citações obtido via API.")

        except Exception as e:
            logging.warning(f"Citation Overview falhou com exceção: {e}")

    # ==========================================================================
    # PASSO 3: CSV FALLBACK
    # ==========================================================================
    if not api_overview_success:
        csv_path = "CitationOverview.csv"
        if os.path.exists(csv_path):
            logging.info("Usando fallback CSV do Scopus.")
            try:
                with open(csv_path, newline="", encoding="utf-8-sig") as f:
                    reader = csv.reader(f)
                    rows = list(reader)

                year_row_idx = -1
                for i, r in enumerate(rows):
                    if any(c.isdigit() and 2000 < int(c) < 2030 for c in r):
                        year_row_idx = i
                        break
                
                if year_row_idx != -1 and len(rows) > year_row_idx + 1:
                    year_row = rows[year_row_idx]
                    
                    for row_idx in range(year_row_idx + 1, len(rows)):
                        row = rows[row_idx]
                        if not row or "total" in str(row[0]).lower(): continue 
                        
                        for y_str, val_str in zip(year_row, row):
                            if y_str.isdigit() and val_str.isdigit():
                                y = int(y_str)
                                v = int(val_str)
                                yearly_citation_totals[y] = yearly_citation_totals.get(y, 0) + v
            except Exception as e:
                logging.error(f"Erro ao processar CSV Scopus: {e}")

    # ==========================================================================
    # PASSO 4: MONTAGEM FINAL
    # ==========================================================================
    graph_data = []
    all_years = sorted(set(yearly_citation_totals.keys()) | set(yearly_pub_counts.keys()))
    current_year = datetime.now().year

    for y in all_years:
        if 1990 <= y <= current_year + 1:
            graph_data.append({
                "year": y,
                "citations": yearly_citation_totals.get(y, 0),
                "publications": yearly_pub_counts.get(y, 0) 
            })

    cites_all = [a["cited_by"]["value"] for a in articles]
    cites_since_2021 = [a["cited_by"]["value"] for a in articles if a.get("year", "").isdigit() and int(a["year"]) >= 2021]

    metrics_table = [
        {"citations": {"all": sum(cites_all), "since_2021": sum(cites_since_2021)}},
        {"h_index": {"all": calculate_h_index(cites_all), "since_2021": calculate_h_index(cites_since_2021)}},
        {"i10_index": {"all": calculate_i10(cites_all), "since_2021": calculate_i10(cites_since_2021)}}
    ]

    return {
        "source_name": "Scopus",
        "profile": {
            "total_publications": len(articles), 
            "cited_by": {
                "table": metrics_table,
                "graph": graph_data 
            }
        },
        "articles": articles
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
# FUNÇÃO DE COMPARAÇÃO E GERAÇÃO DE RELATÓRIO
# ==============================================================================
def analyze_changes(old_data, new_data):
    """
    Compara dados antigos e novos e gera relatório textual.
    Robusta contra dados faltantes, fontes híbridas e métricas derivadas.
    """

    if old_data is None:
        return (["  [!] Arquivo de dados antigo não encontrado."],
                ["initial_generation"])

    report_lines = []
    modification_notes = []

    # --------------------------------------------------------------------------
    # Funções auxiliares
    # --------------------------------------------------------------------------
    def force_int(val):
        try:
            if val is None:
                return 0
            return int(float(val))
        except (ValueError, TypeError):
            return 0

    def get_metrics(data, source_key):
        src = data.get("academicData", {}).get(source_key)

        # compatibilidade Scholar legado
        if not src and source_key == "google_scholar":
            src = data.get("scholarData")

        if not src:
            return {"citations": 0, "h": 0}

        cites = h = 0
        for item in src.get("profile", {}).get("cited_by", {}).get("table", []):
            if "citations" in item:
                cites = force_int(item["citations"].get("all"))
            elif "h_index" in item:
                h = force_int(item["h_index"].get("all"))

        return {"citations": cites, "h": h}

    def get_articles(data):
        """
        Retorna artigos priorizando 'maximized', com fallback explícito.
        """
        acad = data.get("academicData", {})
        if acad.get("maximized", {}).get("articles"):
            return acad["maximized"]["articles"], "maximized"
        if data.get("scholarData", {}).get("articles"):
            return data["scholarData"]["articles"], "scholar"
        return [], "none"

    # --------------------------------------------------------------------------
    # 1. GitHub
    # --------------------------------------------------------------------------
    old_repos = {r.get("name") for r in old_data.get("githubRepos", []) if r.get("name")}
    new_repos = {r.get("name") for r in new_data.get("githubRepos", []) if r.get("name")}

    added = new_repos - old_repos
    if added:
        report_lines.append(f"  [+] Repositórios adicionados: {len(added)}")

    # --------------------------------------------------------------------------
    # 2. Métricas globais
    # --------------------------------------------------------------------------
    sources = [
        ("google_scholar", "Scholar"),
        ("scopus", "Scopus"),
        ("web_of_science", "WoS"),
        ("maximized", "Total (Agregado)")
    ]

    for key, label in sources:
        old_m = get_metrics(old_data, key)
        new_m = get_metrics(new_data, key)

        if new_m["citations"] != old_m["citations"]:
            diff = new_m["citations"] - old_m["citations"]
            sign = "+" if diff > 0 else ""
            report_lines.append(
                f"  [*] {label} Citações: "
                f"{old_m['citations']} → {new_m['citations']} ({sign}{diff})"
            )

        if new_m["h"] != old_m["h"]:
            report_lines.append(
                f"  [*] {label} H-index: {old_m['h']} → {new_m['h']}"
            )

    # --------------------------------------------------------------------------
    # 3. Comparação de artigos (DOI > título+ano)
    # --------------------------------------------------------------------------
    old_articles, _ = get_articles(old_data)
    new_articles, src_name = get_articles(new_data)

    def art_key(a):
        if a.get("doi"):
            return f"doi:{a['doi'].lower()}"
        return f"{normalize_title(a.get('title'))}_{a.get('year','')}"

    old_map = {art_key(a): a for a in old_articles if a.get("title")}
    new_map = {art_key(a): a for a in new_articles if a.get("title")}

    added_keys = set(new_map) - set(old_map)
    if added_keys:
        report_lines.append(f"\n--- {len(added_keys)} novas publicações ({src_name}) ---")
        for k in list(added_keys)[:3]:
            report_lines.append(f"  - {new_map[k].get('title', '')[:70]}...")

    # --------------------------------------------------------------------------
    # 4. Atualizações de citações por artigo
    # --------------------------------------------------------------------------
    citation_updates = []
    for k, new_art in new_map.items():
        if k in old_map:
            old_c = force_int((old_map[k].get("cited_by") or {}).get("value"))
            new_c = force_int((new_art.get("cited_by") or {}).get("value"))
            if new_c > old_c:
                citation_updates.append(
                    f"  - {new_art.get('title','')[:40]}...: "
                    f"{old_c} → {new_c} (+{new_c - old_c})"
                )

    if citation_updates:
        report_lines.append(
            f"\n--- {len(citation_updates)} artigos com novas citações ---"
        )
        report_lines.extend(citation_updates[:5])

    return report_lines, modification_notes


# ==============================================================================
# FUNÇÕES DE GERAÇÃO E ATUALIZAÇÃO DE ARQUIVOS
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
        # Limpeza defensiva
        if os.path.exists(temp_writing_filename):
            try:
                os.remove(temp_writing_filename)
            except OSError:
                pass


def update_main_file(main_file, temp_file):
    """
    Atualiza o arquivo principal a partir de um temporário.
    Usa shutil.move para suportar diferentes filesystems.
    Retorna True em sucesso, False em falha.
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

        # Limpeza de segurança
        if os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except OSError:
                pass

        return False

# ==============================================================================
# LÓGICA DE FUSÃO (MERGE) - AUTOMATIZADA E ROBUSTA
# ==============================================================================
def is_valid_string(s):
    """Retorna True se a string contém informação útil (não é None, vazia ou N/A)."""
    if not s or not isinstance(s, str):
        return False
    bad_values = {"n/a", "na", "null", "none", "unknown", "undefined"}
    return s.strip().lower() not in bad_values

def merge_article_into_map(main_map, new_article, source_name):
    """
    Integra um artigo unificando fontes.
    Prioridade:
    1. Citações: Máximo valor encontrado.
    2. Journal/Título: Fonte 'Premium' (Scopus/WoS) vence, mas aceita fonte 'Standard' 
       (Scholar/ORCID) se o campo estiver vazio.
    3. Link: Link original vence, mas gera link DOI se vazio.
    """
    raw_title = (new_article.get("title") or "").strip()
    if not raw_title: return

    norm_title = normalize_title(raw_title)
    
    # --- Extração e Limpeza de Dados da Nova Fonte ---
    new_doi = str(new_article.get("doi") or "").strip()
    new_year = get_year_safe(new_article.get("year"))
    try:
        new_cites = int((new_article.get("cited_by") or {}).get("value") or 0)
    except:
        new_cites = 0

    # Normaliza Journal: verifica vários campos possíveis
    raw_journal = (new_article.get("journal") or new_article.get("journalTitle") or new_article.get("publication") or "")
    new_journal = raw_journal.strip() if is_valid_string(raw_journal) else None

    # Normaliza Link
    new_link = new_article.get("link")
    if not is_valid_string(new_link):
        new_link = None

    # --- 1. MATCHING (Encontrar duplicatas) ---
    match_key = None
    
    # A) Por DOI
    if is_valid_string(new_doi):
        for key, existing in main_map.items():
            ex_doi = str(existing.get("doi") or "").strip()
            if is_valid_string(ex_doi) and ex_doi.lower() == new_doi.lower():
                match_key = key
                break
    
    # B) Por Título (Se não achou por DOI)
    if not match_key:
        if norm_title in main_map:
            match_key = norm_title
        else:
            # Match difuso seguro
            for key in main_map.keys():
                # Só compara se as strings tiverem tamanho razoável para evitar falsos positivos
                if len(key) > 30 and (key in norm_title or norm_title in key):
                    # Validação cruzada com ano para evitar erros
                    ex_year = get_year_safe(main_map[key].get("year"))
                    if new_year and ex_year and new_year != ex_year:
                        continue
                    match_key = key
                    break

    # --- 2. FUSÃO (MERGE) OU CRIAÇÃO ---
    if match_key:
        existing = main_map[match_key]
        
        # --- A) CITAÇÕES: Lógica de Maximização ---
        # Se a nova fonte diz que tem mais citações, atualizamos.
        old_cites = 0
        try: old_cites = int((existing.get("cited_by") or {}).get("value") or 0)
        except: pass
        
        if new_cites > old_cites:
            existing["cited_by"] = {"value": new_cites}

        # --- B) METADADOS: Lógica de Melhoria Contínua ---
        is_premium_source = source_name in ["Scopus", "Web of Science"]
        
        # DOI: Se não tem, pega o novo. Se é ORCID, confia mais.
        if not is_valid_string(existing.get("doi")):
            if is_valid_string(new_doi): existing["doi"] = new_doi
        elif source_name == "ORCID" and is_valid_string(new_doi):
             existing["doi"] = new_doi

        # JOURNAL: 
        # 1. Se a fonte é premium e tem jornal válido -> Sobrescreve.
        # 2. Se a fonte atual está vazia/N/A e a nova tem jornal válido -> Preenche (Gap Filling).
        existing_journal = existing.get("journalTitle")
        has_existing_journal = is_valid_string(existing_journal)
        
        if is_premium_source and new_journal:
            existing["journalTitle"] = new_journal
        elif not has_existing_journal and new_journal:
            existing["journalTitle"] = new_journal
            
        # TÍTULO E ANO:
        # Premium sobrescreve.
        if is_premium_source:
            if is_valid_string(raw_title): existing["title"] = raw_title
            if new_year: existing["year"] = str(new_year)
        else:
            # Se não é premium, só melhora se o título for muito maior (correção de cortes)
            curr_len = len(existing.get("title", ""))
            if len(raw_title) > curr_len + 15: # 15 chars a mais indicam um título mais completo
                existing["title"] = raw_title
            # Preenche ano se faltar
            if new_year and not get_year_safe(existing.get("year")):
                existing["year"] = str(new_year)

        # LINK: Prioriza link explícito. Se não tiver, mantém.
        if new_link and not existing.get("link"):
            existing["link"] = new_link

        # Registra a fonte
        if "sources" not in existing: existing["sources"] = []
        if source_name not in existing["sources"]:
            existing["sources"].append(source_name)
            existing["sources"].sort()

    else:
        # --- 3. NOVO ARTIGO ---
        # Se não tem link, mas tem DOI, cria link DOI automaticamente
        final_link = new_link
        if not final_link and is_valid_string(new_doi):
            final_link = f"https://doi.org/{new_doi}"

        article = {
            "title": raw_title,
            "year": str(new_year) if new_year else "",
            "doi": new_doi if is_valid_string(new_doi) else None,
            "journalTitle": new_journal if new_journal else "N/A",
            "link": final_link,
            "cited_by": {"value": new_cites},
            "sources": [source_name]
        }
        main_map[norm_title] = article

# ==============================================================================
# CÁLCULO DE MÉTRICAS MAXIMIZADAS E GRÁFICO HÍBRIDO
# ==============================================================================
def calculate_maximized_metrics(articles, scholar_data=None, scopus_data=None, wos_data=None):
    """
    Calcula índices H e i10 a partir da lista unificada.
    Gera gráfico combinando o MELHOR dado de cada ano entre as plataformas.
    """
    
    # 1. Recupera lista de todas as citações (já maximizadas no merge)
    citations_list = []
    for art in articles:
        val = int((art.get("cited_by") or {}).get("value") or 0)
        citations_list.append(val)
    
    # 2. Recalcula Índices
    h_index = calculate_h_index(citations_list)
    i10_index = calculate_i10(citations_list)
    total_citations = sum(citations_list)

    # 3. Tabela de Métricas
    table = [
        {"citations": {"all": total_citations, "since_2021": 0}}, 
        {"h_index": {"all": h_index, "since_2021": 0}},
        {"i10_index": {"all": i10_index, "since_2021": 0}}
    ]

    # 4. Construção do Gráfico (Máximo por Ano)
    years_map = {} # { 2023: {'cits': [], 'pubs': []} }

    # Função auxiliar para extrair dados dos gráficos originais das APIs
    def absorb_graph(platform_data):
        if not platform_data: return
        # Tenta pegar estrutura padrão do Scholar/Scopus se disponível
        graph = platform_data.get("profile", {}).get("cited_by", {}).get("graph", [])
        if not graph: 
             # Fallback: Tenta pegar de wos se tiver estrutura diferente ou de scopus
             pass 
        
        for item in graph:
            y = int(item.get("year", 0))
            if y < 1990: continue # Filtro de ruído
            
            if y not in years_map: years_map[y] = {'cits': [0], 'pubs': [0]}
            
            c = int(item.get("citations", 0))
            p = int(item.get("publications", 0))
            years_map[y]['cits'].append(c)
            years_map[y]['pubs'].append(p)

    # Absorve dados de todas as fontes disponíveis
    absorb_graph(scholar_data)
    absorb_graph(scopus_data)
    absorb_graph(wos_data)

    # Verifica os artigos unificados para garantir contagem correta de publicações
    # (Caso as APIs tenham falhado em retornar o gráfico histórico)
    real_pub_counts = {}
    for art in articles:
        y = get_year_safe(art.get("year"))
        if y > 1900:
            real_pub_counts[y] = real_pub_counts.get(y, 0) + 1

    # Mescla contagem real nos dados do gráfico
    all_years = set(years_map.keys()) | set(real_pub_counts.keys())
    
    final_graph = []
    for y in sorted(all_years):
        data = years_map.get(y, {'cits': [0], 'pubs': [0]})
        
        # Citações: O maior valor reportado por qualquer plataforma naquele ano
        max_c = max(data['cits'])
        
        # Publicações: O maior entre (Reportado pelas plataformas) VS (Contagem real dos artigos)
        max_p_apis = max(data['pubs'])
        real_p = real_pub_counts.get(y, 0)
        final_p = max(max_p_apis, real_p)

        final_graph.append({
            "year": y,
            "citations": max_c,
            "publications": final_p
        })

    return {
        "source_name": "Maximized Dataset",
        "total_publications": len(articles),
        "cited_by": {
            "table": table,
            "graph": final_graph
        },
        "articles": articles
    }

# ==============================================================================
# EXECUÇÃO PRINCIPAL
# ==============================================================================
if __name__ == "__main__":
    logging.info("--- Iniciando atualização de dados acadêmicos ---")

    # 1. Carregar dados antigos (Cache/Histórico)
    old_data = load_json_data(MAIN_FILENAME)

    # 2. Coleta de Dados
    logging.info("--- Etapa 1: Coleta de Dados ---")
    
    github_repos = fetch_github_repos(GITHUB_USERNAME)

    # Scholar
    scholar_data = None
    for api_key in SERPAPI_KEYS:
        scholar_data = fetch_scholar_data(SCHOLAR_AUTHOR_ID, api_key)
        if scholar_data: break
    if not scholar_data:
        # Fallback para cache antigo se API falhar
        if old_data: scholar_data = old_data.get("academicData", {}).get("google_scholar")
        if not scholar_data: scholar_data = {"profile": {}, "articles": []}

    # Outras Fontes
    scopus_data = fetch_scopus_data(SCOPUS_AUTHOR_ID, SCOPUS_API_KEY) if SCOPUS_API_KEY and SCOPUS_AUTHOR_ID else None
    wos_data = fetch_wos_data(WOS_RESEARCHER_ID, WOS_API_KEY) if WOS_RESEARCHER_ID else None
    orcid_data = fetch_orcid_works(ORCID_ID) if ORCID_ID else []
    
    # ------------------------------------------------------------------
    # 3. Merge Automatizado
    # ------------------------------------------------------------------
    logging.info("--- Etapa 2: Unificação e Processamento ---")

    master_map = {}

    # A ordem de inserção ajuda, mas a função `merge_article_into_map` agora é inteligente
    # o suficiente para decidir qual dado manter independente da ordem.
    
    # Inserimos ORCID/Scopus/WoS primeiro (Metadados Estruturados)
    if scopus_data:
        for art in scopus_data.get("articles", []):
            merge_article_into_map(master_map, art, "Scopus")

    if wos_data:
        for art in wos_data.get("articles", []):
            merge_article_into_map(master_map, art, "Web of Science")

    orcid_list = orcid_data if isinstance(orcid_data, list) else orcid_data.get("articles", [])
    for art in orcid_list:
        merge_article_into_map(master_map, art, "ORCID")

    # Inserimos Scholar (Rico em Citações, mas sujo em Metadados)
    for art in scholar_data.get("articles", []):
        merge_article_into_map(master_map, art, "Google Scholar")

    # ------------------------------------------------------------------
    # 4. Finalização
    # ------------------------------------------------------------------
    final_articles = list(master_map.values())

    # Ordenação Final: Citações > Ano
    final_articles.sort(
        key=lambda x: (
            int((x.get("cited_by") or {}).get("value") or 0),
            get_year_safe(x.get("year"))
        ),
        reverse=True
    )

    # [AUTOMÁTICO] Gera métricas e gráfico combinando o melhor de cada fonte
    maximized_obj = calculate_maximized_metrics(
        final_articles, 
        scholar_data=scholar_data,
        scopus_data=scopus_data,
        wos_data=wos_data
    )

    # ------------------------------------------------------------------
    # 5. Montagem do JSON e Persistência
    # ------------------------------------------------------------------
    logging.info("--- Etapa 3: Montagem do JSON Final ---")

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
            },
            "maximized": maximized_obj
        }
    }

    logging.info("--- Etapa 4: Análise de Mudanças ---")
    report_lines, _ = analyze_changes(old_data, new_data)

    if report_lines:
        print("\n" + "=" * 60)
        print(" RELATÓRIO DE ATUALIZAÇÃO")
        print("=" * 60)
        for line in report_lines: print(line)
        print("=" * 60 + "\n")
    else:
        print("\n=== Nenhuma alteração relevante detectada. ===\n")

    if generate_fallback_file(new_data, TEMP_FILENAME):
        _ = update_main_file(MAIN_FILENAME, TEMP_FILENAME)

    logging.info("--- Processo concluído com sucesso ---")

