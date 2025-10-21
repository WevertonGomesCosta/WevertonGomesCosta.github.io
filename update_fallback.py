# update_fallback_final.py
#
# Descrição:
# Script para buscar dados de várias fontes, combiná-los e gerar um arquivo de fallback.
# As chaves e configurações são carregadas de um arquivo 'keys.json' unificado.
# Implementa fallback automático para a chave da API SerpApi e trata falhas de conexão.
#
# Autor: Gemini & Weverton Costa
# Versão: 8.3.0 (Versão robusta com fallback de API e tratamento de falhas)

import requests
import json
import re
from datetime import datetime
import sys
import os
import unicodedata

# ==============================================================================
# CARREGAMENTO DE CONFIGURAÇÕES
# ==============================================================================
def load_keys(keys_file="keys.json"):
    """Carrega as configurações e chaves de um arquivo JSON."""
    try:
        with open(keys_file, 'r', encoding='utf-8') as f:
            print(f"✓ Carregando configurações do arquivo '{keys_file}'...")
            return json.load(f)
    except FileNotFoundError:
        print(f"✗ ERRO CRÍTICO: O arquivo de chaves '{keys_file}' não foi encontrado.")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"✗ ERRO CRÍTICO: O arquivo '{keys_file}' contém um JSON inválido.")
        sys.exit(1)

# Carrega todas as chaves e IDs do arquivo JSON
keys = load_keys()

# Atribui as variáveis de configuração a partir do arquivo carregado
GITHUB_USERNAME = keys.get("github_username")
GITHUB_TOKEN = keys.get("github_token")
SCHOLAR_AUTHOR_ID = keys.get("scholar_author_id")
ORCID_ID = keys.get("orcid_id")

# Lista de chaves SerpApi para tentativa e fallback
SERPAPI_KEYS = [keys.get("serpapi_api_key"), keys.get("serpapi_api_key2")]
# Filtra chaves que são None, vazias ou strings de placeholder
SERPAPI_KEYS = [key for key in SERPAPI_KEYS if key and "CHAVE" not in key.upper()]

# Nomes dos arquivos de dados
MAIN_FILENAME = "fallback-data.js"
TEMP_FILENAME = "fallback-data2.js"

# Validação das chaves essenciais
if not all([GITHUB_USERNAME, SCHOLAR_AUTHOR_ID, ORCID_ID, SERPAPI_KEYS]):
    print("✗ ERRO CRÍTICO: Verifique se 'github_username', 'scholar_author_id', 'orcid_id' e pelo menos uma 'serpapi_api_key' válida estão definidas no 'keys.json'.")
    sys.exit(1)

# ==============================================================================
# FUNÇÕES AUXILIARES
# ==============================================================================
def normalize_title(title):
    """Normaliza um título para facilitar a comparação, removendo HTML, acentos e caracteres especiais."""
    if not title:
        return ''
    # 1. Remove tags HTML
    clean_title = re.sub(r'<.*?>', '', title)
    # 2. Normaliza para remover acentos (NFD form) e remove caracteres não-ASCII
    clean_title = unicodedata.normalize('NFKD', clean_title).encode('ascii', 'ignore').decode('utf-8')
    # 3. Remove pontuação, converte para minúsculas e remove espaços extras.
    return re.sub(r'[^\w\s]', '', clean_title).lower().strip()

def load_js_data(filepath):
    """Carrega os dados de um arquivo .js, extraindo e limpando o objeto JSON."""
    if not os.path.exists(filepath):
        print(f"AVISO: Arquivo antigo '{filepath}' não encontrado para comparação.")
        return None
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        json_str = content[content.find('{') : content.rfind('}')+1]
        json_str = re.sub(r'/\*.*?\*/', '', json_str, flags=re.DOTALL)
        # Regex aprimorado para lidar com nomes de chaves sem aspas
        json_str = re.sub(r'([{,]\s*)([a-zA-Z0-9_]+)(\s*:)', r'\1"\2"\3', json_str)
        # Remove vírgulas extras antes de '}' ou ']'
        json_str = re.sub(r',\s*([\}\]])', r'\1', json_str)

        return json.loads(json_str)
    except Exception as e:
        print(f"✗ Erro ao carregar e decodificar o arquivo JSON '{filepath}': {e}")
        return None

# ==============================================================================
# FUNÇÕES DE BUSCA DE DADOS
# ==============================================================================

def fetch_github_repos(username):
    """Busca os repositórios de um usuário no GitHub."""
    print("Buscando repositórios do GitHub...")
    api_url = f"https://api.github.com/users/{username}/repos?sort=pushed&per_page=100"
    headers = {"Accept": "application/vnd.github.v3+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"

    try:
        response = requests.get(api_url, headers=headers)
        response.raise_for_status()
        repos = response.json()

        formatted_repos = []
        for repo in repos:
            homepage_url = repo.get("homepage")
            if not homepage_url and repo.get("has_pages"):
                homepage_url = f"https://{username}.github.io/{repo['name']}/"

            formatted_repos.append({
                "name": repo.get("name"), "html_url": repo.get("html_url"),
                "homepage": homepage_url, "description": repo.get("description"),
                "language": repo.get("language"), "stargazers_count": repo.get("stargazers_count"),
                "forks_count": repo.get("forks_count"), "updated_at": repo.get("updated_at"),
                "topics": repo.get("topics", [])
            })
        print(f"✓ {len(formatted_repos)} repositórios do GitHub encontrados.")
        return formatted_repos
    except requests.exceptions.RequestException as e:
        print(f"✗ Erro ao buscar repositórios do GitHub: {e}")
        return None

def fetch_scholar_profile(author_id, api_key):
    """Busca e padroniza o perfil do Google Scholar via SerpApi."""
    print("Buscando perfil do Google Scholar...")
    params = { "engine": "google_scholar_author", "author_id": author_id, "api_key": api_key, "hl": "pt-br" }
    try:
        response = requests.get("https://serpapi.com/search.json", params=params)
        response.raise_for_status()
        data = response.json()
        if "error" in data:
            raise Exception(data["error"])

        raw_table = data.get("cited_by", {}).get("table", [])

        # Padroniza chaves de idioma (ex: 'desde_2020' para 'since_2020')
        for item in raw_table:
            for metric_values in item.values():
                if 'desde_2020' in metric_values:
                    metric_values['since_2020'] = metric_values.pop('desde_2020')

        standardized_table = []
        for item in raw_table:
            if "citações" in item:
                standardized_table.append({"citations": item["citações"]})
            elif "Índice_h" in item:
                standardized_table.append({"h_index": item["Índice_h"]})
            elif "Índice_i10" in item:
                standardized_table.append({"i10_index": item["Índice_i10"]})
            else:
                 standardized_table.append(item)

        api_graph = data.get("cited_by", {}).get("graph", [])
        api_graph_map = {item['year']: item['citations'] for item in api_graph}

        min_api_year = min(api_graph_map.keys()) if api_graph_map else datetime.now().year

        # Garante que o gráfico comece em 2017, preenchendo anos vazios
        final_graph = []
        for year in range(2017, min_api_year):
            if year not in api_graph_map:
                final_graph.append({"year": year, "citations": 0})

        final_graph.extend(api_graph)
        final_graph.sort(key=lambda x: x['year'])

        profile_data = {
            "table": standardized_table,
            "graph": final_graph
        }
        print("✓ Perfil do Google Scholar encontrado e padronizado.")
        return profile_data
    except Exception as e:
        print(f"✗ Erro ao buscar perfil do Scholar: {e}")
        return None

def fetch_all_scholar_articles(author_id, api_key):
    """Busca todos os artigos do Google Scholar, paginando os resultados."""
    print("Buscando publicações do Google Scholar (isso pode levar um tempo)...")
    all_articles = []
    start_index = 0
    while True:
        print(f"  - Buscando página de resultados (iniciando em {start_index})...")
        params = { "engine": "google_scholar_author", "author_id": author_id, "api_key": api_key, "hl": "pt-br", "start": start_index, "num": 20 }
        try:
            response = requests.get("https://serpapi.com/search.json", params=params)
            response.raise_for_status()
            data = response.json()
            if "error" in data: raise Exception(data["error"])
            articles_on_page = data.get("articles", [])
            if not articles_on_page: break
            all_articles.extend(articles_on_page)
            start_index += len(articles_on_page)
            if len(articles_on_page) < 20: break
        except Exception as e:
            print(f"✗ Erro ao buscar página de publicações do Scholar: {e}")
            # Retorna o que foi encontrado até o momento da falha
            return all_articles
    print(f"✓ Total de {len(all_articles)} publicações do Scholar encontradas.")
    return all_articles

def fetch_orcid_works(orcid_id):
    """Busca as publicações de um perfil ORCID de forma robusta, lidando com campos nulos."""
    print("Buscando publicações do ORCID...")
    api_url = f"https://pub.orcid.org/v3.0/{orcid_id}/works"
    headers = {"Accept": "application/json"}
    try:
        response = requests.get(api_url, headers=headers)
        response.raise_for_status()
        data = response.json()

        orcid_works = []
        for group in data.get('group', []):
            if not group.get('work-summary'): continue
            summary = group['work-summary'][0]

            title_obj = summary.get('title')
            if not title_obj or not title_obj.get('title') or not title_obj['title'].get('value'): continue
            title = title_obj['title']['value']

            doi, doi_link = None, None
            if summary.get('external-ids'):
                for ext_id in summary.get('external-ids', {}).get('external-id', []):
                    if ext_id and ext_id.get('external-id-type') == 'doi':
                        doi = ext_id.get('external-id-value')
                        ext_id_url_obj = ext_id.get('external-id-url')
                        doi_link = ext_id_url_obj.get('value') if ext_id_url_obj else None
                        break

            url_obj = summary.get('url')
            link = url_obj.get('value') if url_obj else None

            pub_date_obj = summary.get('publication-date')
            year_obj = pub_date_obj.get('year') if pub_date_obj else None
            year = year_obj.get('value') if year_obj else None

            journal_title_obj = summary.get('journal-title')
            journal_title = journal_title_obj.get('value', 'N/A') if journal_title_obj else 'N/A'

            orcid_works.append({
                "title": title, "doi": doi,
                "doiLink": doi_link or (f"https://doi.org/{doi}" if doi else None),
                "year": year, "journalTitle": journal_title, "link": link
            })
        print(f"✓ {len(orcid_works)} publicações encontradas no ORCID.")
        return orcid_works
    except requests.exceptions.RequestException as e:
        print(f"✗ Erro ao buscar dados do ORCID: {e}")
        return []

# ==============================================================================
# FUNÇÃO DE COMPARAÇÃO E GERAÇÃO DE RELATÓRIO
# ==============================================================================
def analyze_changes(old_data, new_data):
    """Compara os dados antigos e novos e gera notas de modificação e um relatório para o console."""
    if old_data is None:
        return ["  [!] Arquivo de dados antigo não encontrado. Criando um novo."], ["initial data generation"]

    report_lines, modification_notes = [], []

    # Repositórios
    old_repos = {r.get('name') for r in old_data.get('githubRepos', [])}
    new_repos = {r.get('name') for r in new_data.get('githubRepos', [])}
    added_repos = new_repos - old_repos
    if added_repos:
        report_lines.append(f"  [+] Repositórios Adicionados ({len(added_repos)}): {', '.join(added_repos)}")
        for repo in added_repos: modification_notes.append(f"new repository: {repo}")

    # Métricas
    def extract_metrics(data):
        m = {'citations': 0, 'h_index': 0, 'i10_index': 0}
        # Tratamento para evitar erro se 'cited_by' for None
        table = (data.get('scholarData', {}).get('profile', {}).get('cited_by') or {}).get('table', [])
        for item in table:
            if 'citations' in item: m['citations'] = item['citations'].get('all', 0)
            if 'h_index' in item: m['h_index'] = item['h_index'].get('all', 0)
            if 'i10_index' in item: m['i10_index'] = item['i10_index'].get('all', 0)
        return m

    old_m, new_m = extract_metrics(old_data), extract_metrics(new_data)
    if new_m['citations'] != old_m['citations']:
        report_lines.append(f"  [*] Citações: {old_m['citations']} -> {new_m['citations']}")
        modification_notes.append(f"citations {old_m['citations']} to {new_m['citations']}")
    if new_m['h_index'] != old_m['h_index']:
        report_lines.append(f"  [*] Índice-H: {old_m['h_index']} -> {new_m['h_index']}")
        modification_notes.append(f"h-index {old_m['h_index']} to {new_m['h_index']}")
    if new_m['i10_index'] != old_m['i10_index']:
        report_lines.append(f"  [*] Índice-i10: {old_m['i10_index']} -> {new_m['i10_index']}")
        modification_notes.append(f"i10-index {old_m['i10_index']} to {new_m['i10_index']}")

    # Artigos e Citações
    old_articles = {normalize_title(a.get('title')): a for a in old_data.get('scholarData', {}).get('articles', [])}
    new_articles = {normalize_title(a.get('title')): a for a in new_data.get('scholarData', {}).get('articles', [])}
    added_titles = set(new_articles.keys()) - set(old_articles.keys())

    if added_titles:
        report_lines.append(f"\n--- Novas Publicações ({len(added_titles)}) ---")
        for norm_title in added_titles:
            full_title = new_articles[norm_title].get('title', norm_title)
            report_lines.append(f"    - {full_title[:80]}...")
            modification_notes.append(f"new publication: {full_title[:50]}...")

    citation_updates = []
    for norm_title, new_art in new_articles.items():
        if norm_title in old_articles:
            old_cites = (old_articles[norm_title].get('cited_by') or {}).get('value') or 0
            new_cites = (new_art.get('cited_by') or {}).get('value') or 0
            if new_cites > old_cites:
                title = new_art.get('title', '')
                citation_updates.append(f"    - '{title[:50]}...': {old_cites} -> {new_cites} (+{new_cites - old_cites})")
                modification_notes.append(f"citation '{title[:30]}...' {old_cites} to {new_cites}")

    if citation_updates:
        report_lines.append(f"\n--- Atualizações de Citações ({len(citation_updates)}) ---")
        report_lines.extend(citation_updates)

    return report_lines, modification_notes

# ==============================================================================
# FUNÇÕES DE GERAÇÃO E ATUALIZAÇÃO DE ARQUIVOS
# ==============================================================================
def generate_fallback_file(data, filename, modification_notes=None):
    """Gera o arquivo de dados com notas de modificação no cabeçalho."""
    print(f"\nGerando o arquivo '{filename}'...")
    json_string = json.dumps(data, indent=4, ensure_ascii=False)

    modifications_str = ""
    if modification_notes:
        for note in modification_notes:
            modifications_str += f" * @modification {note}\n"

    js_content = f"""/**
 * @file {os.path.basename(MAIN_FILENAME)}
 * @description Contém dados estáticos de fallback para o site.
 * Gerado automaticamente por 'update_fallback_final.py'.
 * @version {datetime.now().strftime('%Y.%m.%d')}
 * @generated_at {datetime.now().isoformat()}
{modifications_str} */

window.fallbackData = {json_string};
"""
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(js_content)
        print(f"✅ Arquivo '{filename}' gerado com sucesso!")
        return True
    except IOError as e:
        print(f"✗ Erro ao escrever o arquivo: {e}")
        return False

def update_main_file(main_file, temp_file):
    """Substitui o arquivo principal pelo temporário."""
    try:
        with open(temp_file, 'r', encoding='utf-8') as f_new, open(main_file, 'w', encoding='utf-8') as f_old:
            f_old.write(f_new.read())
        print(f"  ✓ Arquivo '{main_file}' atualizado com sucesso!")
    except IOError as e:
        print(f"  ✗ Erro ao atualizar o arquivo: {e}")

# ==============================================================================
# PONTO DE ENTRADA DO SCRIPT
# ==============================================================================
if __name__ == "__main__":
    print("Iniciando a atualização do arquivo de fallback...")

    if not SERPAPI_KEYS:
        print("\n✗ ERRO CRÍTICO: Nenhuma chave da API da SerpApi foi configurada corretamente.")
        sys.exit(1)

    # 1. Buscar GitHub e ORCID (são independentes)
    github_repos = fetch_github_repos(GITHUB_USERNAME)
    orcid_works = fetch_orcid_works(ORCID_ID)

    # -----------------------------------------------------------------
    # 2. Buscar dados do Scholar com LÓGICA DE FALLBACK CORRIGIDA
    # -----------------------------------------------------------------
    scholar_profile = None
    scholar_articles_raw = None

    for i, key in enumerate(SERPAPI_KEYS):
        print(f"\nTentando buscar dados do Scholar com a Chave {i+1}/{len(SERPAPI_KEYS)}...")

        temp_profile = fetch_scholar_profile(SCHOLAR_AUTHOR_ID, key)
        temp_articles = fetch_all_scholar_articles(SCHOLAR_AUTHOR_ID, key)

        # Checa se a busca foi bem-sucedida (retornou dados, mesmo que vazios)
        if temp_profile is not None and temp_articles is not None:
            print(f"✓ Sucesso com a Chave {i+1}.")
            scholar_profile = temp_profile
            scholar_articles_raw = temp_articles
            break # Sai do loop 'for' ao encontrar uma chave válida
        else:
            print(f"✗ Falha ao buscar dados com a Chave {i+1}.")

    # -----------------------------------------------------------------
    # 3. Lidar com falha de TODAS as chaves (Previne o crash)
    # -----------------------------------------------------------------
    if scholar_profile is None:
         print("\nAVISO: Não foi possível buscar o perfil do Scholar com nenhuma chave.")
         scholar_profile = {} # Define como dicionário vazio para evitar o crash
    if scholar_articles_raw is None:
         print("AVISO: Não foi possível buscar os artigos do Scholar com nenhuma chave.")
         scholar_articles_raw = [] # Define como lista vazia

    # Aborta somente se os dados essenciais do GitHub não puderem ser buscados
    if not github_repos:
        print("\n✗ ERRO CRÍTICO: A execução foi abortada, pois não foi possível buscar os dados do GitHub.")
        sys.exit(1)

    # 4. Combinar dados de publicações
    print("\nCombinando dados do ORCID e Google Scholar...")
    merged_articles_map = {}
    for work in orcid_works:
        norm_title = normalize_title(work.get("title"))
        if norm_title:
            work['cited_by'] = {"value": 0}
            merged_articles_map[norm_title] = work

    for scholar_art in scholar_articles_raw:
        norm_title = normalize_title(scholar_art.get("title"))
        if not norm_title: continue
        if norm_title in merged_articles_map:
            if scholar_art.get("cited_by"):
                merged_articles_map[norm_title]['cited_by'] = {"value": scholar_art.get("cited_by", {}).get("value", 0)}
            if scholar_art.get("link"):
                merged_articles_map[norm_title]['link'] = scholar_art.get("link")
        else:
            merged_articles_map[norm_title] = {
                "title": scholar_art.get("title"), "doi": None, "doiLink": None,
                "year": str(scholar_art.get("year", "")),
                "journalTitle": scholar_art.get("publication", "N/A"),
                "link": scholar_art.get("link"),
                "cited_by": {"value": scholar_art.get("cited_by", {}).get("value", 0)}
            }

    merged_articles = sorted(list(merged_articles_map.values()),
                             key=lambda x: ((x.get("cited_by") or {}).get("value") or 0, int(x.get("year") or 0)),
                             reverse=True)
    print(f"✓ Combinação finalizada. Total de {len(merged_articles)} publicações.")

    # 5. Montar o objeto final, comparar com o antigo e gerar o arquivo
    new_data = {
        "githubRepos": github_repos,
        "scholarData": {"profile": {"cited_by": scholar_profile}, "articles": merged_articles}
    }
    old_data = load_js_data(MAIN_FILENAME)

    report_lines, modification_notes = analyze_changes(old_data, new_data)

    if generate_fallback_file(new_data, TEMP_FILENAME, modification_notes):
        print("\n" + "="*50)
        print("RELATÓRIO DE MUDANÇAS")
        print("="*50)

        if report_lines:
            for line in report_lines:
                print(line)

            print("\n" + "="*50)
            print(f"  [!] Mudanças detectadas. Atualizando '{MAIN_FILENAME}'...")
            update_main_file(MAIN_FILENAME, TEMP_FILENAME)
        else:
            print("  ✓ Nenhuma mudança detectada. O arquivo principal já está atualizado.")

        print("="*50)

    # 6. Limpar o arquivo temporário
    try:
        if os.path.exists(TEMP_FILENAME):
            os.remove(TEMP_FILENAME)
            print(f"\n✓ Arquivo temporário '{TEMP_FILENAME}' excluído com sucesso.")
    except OSError as e:
        print(f"\n✗ Erro ao excluir o arquivo temporário: {e}")

    print("\nProcesso finalizado.")
