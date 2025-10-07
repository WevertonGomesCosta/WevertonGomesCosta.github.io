# Carrega o pacote necessário para manipulação de XML
library(xml2)

# --- 1. Configurações ---
# Defina a URL base do seu site
base_url <- "https://wevertongomescosta.github.io"
# Define o diretório raiz onde os repositórios do site estão
root_dir <- "C:/Users/Weverton/OneDrive/GitHub"
# Nome do arquivo de saída
output_file <- "sitemap_completo.xml"

cat("Iniciando a busca por arquivos HTML...\n")

# --- 2. Encontrar todos os arquivos .html recursivamente ---
html_files <- list.files(
  path = root_dir,
  pattern = "\\.html$",
  recursive = TRUE,
  full.names = TRUE,
  ignore.case = TRUE
)

# **NOVO: Filtra arquivos indesejados (bibliotecas, outputs, etc.)**
html_files <- html_files[!grepl("site_libs|output|renv", html_files, ignore.case = TRUE)]
html_files <- html_files[!grepl("README\\.html$", html_files, ignore.case = TRUE)]
html_files <- html_files[!grepl("gerar_sitemap\\.R", html_files)]

cat(paste("Encontrados", length(html_files), "arquivos HTML relevantes.\n\n"))

root_dir_abs <- normalizePath(root_dir, winslash = "/")

# --- 3. Processar arquivos e criar a estrutura do sitemap ---
url_data <- lapply(html_files, function(file_path) {
  file_path_norm <- gsub("\\\\", "/", file_path)
  
  relative_path <- sub(paste0("^", root_dir_abs, "/?"), "", file_path_norm)
  
  # **CORREÇÃO MELHORADA: Remove a pasta "/docs/" do caminho**
  relative_path <- sub("/docs/", "/", relative_path)
  
  if (basename(relative_path) == "index.html") {
    url <- paste0(base_url, "/", dirname(relative_path), "/")
    url <- gsub("/\\./$", "/", url) 
  } else {
    url <- paste0(base_url, "/", sub("\\.html$", "", relative_path))
  }
  
  lastmod <- format(file.info(file_path)$mtime, "%Y-%m-%d")
  
  cat(paste("  -> Processando:", url, "\n"))
  
  return(list(loc = url, lastmod = lastmod))
})

# --- 4. Construir o documento XML ---
cat("\nGerando o arquivo sitemap.xml...\n")

urlset <- xml_new_root("urlset", xmlns = "http://www.sitemaps.org/schemas/sitemap/0.9")

for (data in url_data) {
  url_node <- xml_add_child(urlset, "url")
  xml_add_child(url_node, "loc", data$loc)
  xml_add_child(url_node, "lastmod", data$lastmod)
  
  if (data$loc == paste0(base_url, "/")) {
    xml_add_child(url_node, "changefreq", "monthly")
    xml_add_child(url_node, "priority", "1.0")
  } else {
    xml_add_child(url_node, "changefreq", "yearly")
    xml_add_child(url_node, "priority", "0.8")
  }
}

# --- 5. Salvar o arquivo XML ---
write_xml(urlset, file = output_file, options = "format")

cat(paste("\nSucesso! O arquivo '", output_file, "' foi criado/atualizado.\n", sep = ""))
cat("Próximo passo: faça o 'commit' e 'push' do sitemap.xml para o seu GitHub.\n")

# Carrega os pacotes necessários
library(xml2)
library(httr)

# --- 1. Configurações ---
# Arquivo de entrada: o sitemap grande gerado automaticamente
input_file <- "sitemap_completo.xml"
# Arquivo de saída: o sitemap limpo e validado
output_file <- "sitemap.xml"

cat(paste("Lendo o arquivo de entrada:", input_file, "\n"))

# Verifica se o arquivo de entrada existe
if (!file.exists(input_file)) {
  stop(paste("ERRO: O arquivo de entrada '", input_file, "' não foi encontrado. Renomeie seu sitemap completo para este nome."))
}

# --- 2. Leitura e Extração das URLs ---
sitemap <- read_xml(input_file)
url_nodes <- xml_find_all(sitemap, ".//d1:url", xml_ns(sitemap))

cat(paste("Encontrados", length(url_nodes), "URLs para verificar.\n\n"))

# **CORREÇÃO: Armazenaremos os DADOS das URLs válidas, não os nós**
valid_url_data <- list()

# --- 3. Verificação de cada URL ---
for (i in seq_along(url_nodes)) {
  node <- url_nodes[[i]]
  loc_node <- xml_find_first(node, ".//d1:loc")
  url <- xml_text(loc_node)
  
  cat(paste0("[", i, "/", length(url_nodes), "] Verificando: ", url, " ... "))
  
  tryCatch({
    response <- HEAD(url, timeout(5))
    status <- status_code(response)
    
    if (status == 200) {
      cat("OK (200)\n")
      # **CORREÇÃO: Extrai todos os dados do nó e guarda em uma lista**
      lastmod_node <- xml_find_first(node, ".//d1:lastmod")
      changefreq_node <- xml_find_first(node, ".//d1:changefreq")
      priority_node <- xml_find_first(node, ".//d1:priority")
      
      valid_url_data[[length(valid_url_data) + 1]] <- list(
        loc = url,
        lastmod = xml_text(lastmod_node),
        changefreq = xml_text(changefreq_node),
        priority = xml_text(priority_node)
      )
    } else {
      cat(paste("ERRO (", status, ")\n", sep = ""))
    }
  }, error = function(e) {
    cat("FALHA NA CONEXÃO\n")
  })
}

# --- 4. Geração do Novo Sitemap ---
cat(paste("\nEncontradas", length(valid_url_data), "URLs válidas.\n"))
cat("Gerando o novo arquivo sitemap.xml...\n")

new_sitemap <- xml_new_root("urlset", xmlns = "http://www.sitemaps.org/schemas/sitemap/0.9")

# **NOVO: Adiciona a URL da página principal manualmente no topo**
url_node_home <- xml_add_child(new_sitemap, "url")
xml_add_child(url_node_home, "loc", "https://wevertongomescosta.github.io/")
xml_add_child(url_node_home, "lastmod", "2025-10-07")
xml_add_child(url_node_home, "changefreq", "monthly")
xml_add_child(url_node_home, "priority", "1.0")


# **CORREÇÃO: Recria cada nó <url> a partir dos dados que salvamos**
for (data in valid_url_data) {
  # **NOVO: Pula a página principal se ela já foi adicionada**
  if (data$loc == "https://wevertongomescosta.github.io/") {
    next # Pula para a próxima iteração
  }
  
  url_node <- xml_add_child(new_sitemap, "url")
  xml_add_child(url_node, "loc", data$loc)
  
  if (!is.na(data$lastmod)) {
    xml_add_child(url_node, "lastmod", data$lastmod)
  }
  if (!is.na(data$changefreq)) {
    xml_add_child(url_node, "changefreq", data$changefreq)
  }
  if (!is.na(data$priority)) {
    xml_add_child(url_node, "priority", data$priority)
  }
}

# Salva o arquivo final
write_xml(new_sitemap, file = output_file, options = "format")

cat(paste("\nSucesso! O arquivo '", output_file, "' foi criado apenas com as URLs válidas.\n", sep = ""))
cat("Próximo passo: envie este novo 'sitemap.xml' para o seu GitHub e depois para o Google Search Console.\n")



