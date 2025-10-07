import os
from datetime import datetime
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

def gerar_sitemap():
    # --- Configurações ---
    # Altere para a URL base do seu site
    BASE_URL = "https://wevertongomescosta.github.io"
    # Pasta onde o script vai procurar os arquivos. '.' significa a pasta atual.
    DIRETORIO_PROJETO = '.'
    # Nome do arquivo de sitemap a ser gerado
    NOME_ARQUIVO_SAIDA = 'sitemap.xml'
    
    urls_encontradas = []
    
    print("Iniciando a busca por arquivos HTML...")

    # Percorre todas as pastas e arquivos a partir do diretório do projeto
    for raiz, _, arquivos in os.walk(DIRETORIO_PROJETO):
        # Ignora pastas que começam com '.', como .git
        if any(part.startswith('.') for part in raiz.split(os.sep)):
            continue

        for arquivo in arquivos:
            if arquivo.endswith(".html"):
                # Monta o caminho completo do arquivo local
                caminho_arquivo = os.path.join(raiz, arquivo)
                
                # Obtém a data da última modificação do arquivo
                timestamp_modificacao = os.path.getmtime(caminho_arquivo)
                data_modificacao = datetime.fromtimestamp(timestamp_modificacao).strftime('%Y-%m-%d')

                # Transforma o caminho do arquivo local em uma URL
                url_relativa = os.path.relpath(caminho_arquivo, DIRETORIO_PROJETO).replace(os.sep, '/')
                
                # Trata o caso especial do 'index.html'
                if url_relativa.endswith('index.html'):
                    # Remove 'index.html' para ter uma URL "limpa"
                    url_relativa = url_relativa[:-10]
                
                # Constrói a URL final
                url_final = f"{BASE_URL}/{url_relativa}"

                # Adiciona a URL e a data de modificação à nossa lista
                urls_encontradas.append({
                    "loc": url_final,
                    "lastmod": data_modificacao
                })
                print(f"  -> Encontrado: {url_final}")

    # --- Criação do arquivo XML ---
    print("\nGerando o arquivo sitemap.xml...")
    
    urlset = Element('urlset', xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")

    for item in urls_encontradas:
        url_element = SubElement(urlset, 'url')
        
        SubElement(url_element, 'loc').text = item['loc']
        SubElement(url_element, 'lastmod').text = item['lastmod']
        
        # Define prioridade e frequência de mudança (pode ser customizado)
        if item['loc'] == BASE_URL + "/":
            SubElement(url_element, 'priority').text = '1.0'
            SubElement(url_element, 'changefreq').text = 'monthly'
        else:
            SubElement(url_element, 'priority').text = '0.8'
            SubElement(url_element, 'changefreq').text = 'yearly'

    # Formata o XML para ficar legível (com indentação)
    xml_bruto = tostring(urlset, 'utf-8')
    xml_formatado = minidom.parseString(xml_bruto).toprettyxml(indent="  ")

    # Salva o arquivo
    with open(NOME_ARQUIVO_SAIDA, 'w') as f:
        f.write(xml_formatado)

    print(f"\nSucesso! O arquivo '{NOME_ARQUIVO_SAIDA}' foi criado/atualizado com {len(urls_encontradas)} URLs.")
    print("Próximo passo: faça o 'commit' e 'push' do sitemap.xml para o seu GitHub.")

# Executa a função principal
if __name__ == "__main__":
    gerar_sitemap()
