# Carrega os pacotes necessários
library(xml2)
library(httr)

# --- 1. Configurações ---
base_url <- "https://wevertongomescosta.github.io"
# Diretório onde estão todos os seus repositórios para o site
root_dir <- "C:/Users/Weverton/OneDrive/GitHub" 
# Nomes dos arquivos de saída
output_xml_file <- "sitemap.xml" 
output_txt_file <- "sitemap.txt"

# --- ETAPA A: ENCONTRAR E PROCESSAR ARQUIVOS HTML ---
cat("--- Etapa A: Buscando arquivos HTML ---\n")

html_files <- list.files(
  path = root_dir,
  pattern = "\\.html$",
  recursive = TRUE,
  full.names = TRUE,
  ignore.case = TRUE
)

# Filtra arquivos indesejados (bibliotecas, outputs, READMEs, etc.)
html_files <- html_files[!grepl("site_libs|output|renv", html_files, ignore.case = TRUE)]
html_files <- html_files[!grepl("README\\.html$", html_files, ignore.case = TRUE)]
# Filtra o repositório principal para excluir a URL raiz
html_files <- html_files[!grepl("WevertonGomesCosta\\.github\\.io", html_files, ignore.case = TRUE)]


cat(paste("Encontrados", length(html_files), "arquivos HTML relevantes para verificação.\n"))

root_dir_abs <- normalizePath(root_dir, winslash = "/")

# Processa os caminhos dos arquivos para criar uma lista de URLs candidatas
candidate_urls <- lapply(html_files, function(file_path) {
  file_path_norm <- gsub("\\\\", "/", file_path)
  relative_path <- sub(paste0("^", root_dir_abs, "/?"), "", file_path_norm)
  relative_path <- sub("/docs/", "/", relative_path)
  
  if (basename(relative_path) == "index.html") {
    url <- paste0(base_url, "/", dirname(relative_path), "/")
    url <- gsub("/\\./$", "/", url)
  } else {
    # Mantém a extensão .html
    url <- paste0(base_url, "/", relative_path)
  }
  
  lastmod <- format(file.info(file_path)$mtime, "%Y-%m-%d")
  return(list(loc = url, lastmod = lastmod))
})

# --- ETAPA B: VERIFICAR CADA URL E FILTRAR AS VÁLIDAS ---
cat("\n--- Etapa B: Verificando a validade das URLs ---\n")

valid_url_data <- list()
total_urls <- length(candidate_urls)

for (i in seq_along(candidate_urls)) {
  data <- candidate_urls[[i]]
  url <- data$loc
  
  cat(paste0("[", i, "/", total_urls, "] Verificando: ", url, " ... "))
  
  tryCatch({
    response <- HEAD(url, timeout(5))
    status <- status_code(response)
    
    if (status == 200) {
      cat("OK (200)\n")
      valid_url_data[[length(valid_url_data) + 1]] <- data
    } else {
      cat(paste("ERRO (", status, ")\n", sep = ""))
    }
  }, error = function(e) {
    cat("FALHA NA CONEXÃO\n")
  })
}

# --- ETAPA C: GERAR OS DOIS SITEMAPS FINAIS ---
cat(paste("\n--- Etapa C: Gerando sitemaps com", length(valid_url_data), "URLs válidas ---\n"))

# 1. Gerar sitemap.xml
cat("Criando arquivo 'sitemap.xml'...\n")
new_sitemap_xml <- xml_new_root("urlset", xmlns = "http://www.sitemaps.org/schemas/sitemap/0.9")

# Adiciona as URLs válidas (a raiz já foi filtrada na busca de arquivos)
for (data in valid_url_data) {
  url_node <- xml_add_child(new_sitemap_xml, "url")
  xml_add_child(url_node, "loc", data$loc)
  xml_add_child(url_node, "lastmod", data$lastmod)
}
write_xml(new_sitemap_xml, file = output_xml_file, options = "format")

# 2. Gerar sitemap.txt
cat("Criando arquivo 'sitemap.txt'...\n")
# Extrai apenas as URLs (loc) da lista de dados válidos
final_urls_txt <- sapply(valid_url_data, `[[`, "loc")
writeLines(final_urls_txt, con = output_txt_file)

cat(paste("\n✅ Sucesso! Os arquivos '", output_xml_file, "' e '", output_txt_file, "' foram criados.\n", sep = ""))
cat("Próximo passo: envie os arquivos para o GitHub.\n")

