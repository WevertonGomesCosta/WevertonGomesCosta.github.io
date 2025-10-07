# Carrega o pacote necessário para manipulação de XML
library(xml2)

# --- 1. Configurações ---
base_url <- "https://wevertongomescosta.github.io"
# Diretório onde estão todos os seus repositórios para o site
root_dir <- "C:/Users/Weverton/OneDrive/GitHub" 
# Nome do arquivo de saída com TODAS as URLs encontradas
output_file <- "sitemap_completo.xml" 

# --- ETAPA A: GERAR LISTA DE URLs A PARTIR DOS ARQUIVOS ---
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

cat(paste("Encontrados", length(html_files), "arquivos HTML relevantes.\n"))

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
    url <- paste0(base_url, "/", relative_path)
  }
  
  # Obtém a data da última modificação do arquivo
  lastmod <- format(file.info(file_path)$mtime, "%Y-%m-%d")
  
  return(list(loc = url, lastmod = lastmod))
})

# --- ETAPA C (simplificada): GERAR O SITEMAP XML COMPLETO ---
cat(paste("\n--- Gerando sitemap_completo.xml com", length(candidate_urls), "URLs ---\n"))

# Cria o nó raiz <urlset>
new_sitemap <- xml_new_root("urlset", xmlns = "http://www.sitemaps.org/schemas/sitemap/0.9")

# Adiciona a página principal manualmente no topo
url_node_home <- xml_add_child(new_sitemap, "url")
xml_add_child(url_node_home, "loc", "https://wevertongomescosta.github.io/")
xml_add_child(url_node_home, "lastmod", format(Sys.Date(), "%Y-%m-%d"))
xml_add_child(url_node_home, "changefreq", "monthly")
xml_add_child(url_node_home, "priority", "1.0")

# Adiciona as outras URLs encontradas
for (data in candidate_urls) {
  if (data$loc == "https://wevertongomescosta.github.io/") {
    next
  }
  
  url_node <- xml_add_child(new_sitemap, "url")
  xml_add_child(url_node, "loc", data$loc)
  xml_add_child(url_node, "lastmod", data$lastmod)
}

# Salva o arquivo final
write_xml(new_sitemap, file = output_file, options = "format")

cat(paste("\n✅ Sucesso! O arquivo '", output_file, "' foi criado.\n", sep = ""))
cat("Próximo passo: execute o script 'verificar_sitemap.R'.\n")
