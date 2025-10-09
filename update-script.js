/**
 * update-script.js
 *
 * Este script automatizado busca os dados mais recentes do GitHub e do Google Scholar
 * e atualiza o arquivo 'fallback-data.js' com essas informações.
 *
 * Para executar:
 * 1. Certifique-se de ter o Node.js instalado.
 * 2. Crie um arquivo 'SERPAPI_KEY.js' na mesma pasta com o seguinte conteúdo:
 * export const SERPAPI_KEY = "SUA_CHAVE_API_AQUI";
 * 3. No terminal, execute: npm install
 * 4. Execute o script com: npm start
 *
 * Recomenda-se agendar a execução diária deste script (usando cron, Agendador de Tarefas do Windows, etc.).
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// --- CONFIGURAÇÕES ---
const GITHUB_USER = 'WevertonGomesCosta';
const SCHOLAR_USER_ID = "eJNKcHsAAAAJ";
const FALLBACK_FILE_PATH = path.resolve(process.cwd(), 'fallback-data.js');
const PROXY_URL = 'https://corsproxy.io/?'; // Usado para evitar problemas de CORS com a SerpApi

// Importa a chave da API de um arquivo separado para segurança.
// É uma prática ainda melhor usar variáveis de ambiente (process.env.SERPAPI_KEY).
let SERPAPI_KEY;
try {
    const keyModule = await import('./SERPAPI_KEY.js');
    SERPAPI_KEY = keyModule.SERPAPI_KEY;
} catch (error) {
    console.error("ERRO: O arquivo 'SERPAPI_KEY.js' não foi encontrado ou está mal formatado.");
    console.error("Crie o arquivo com o conteúdo: export const SERPAPI_KEY = 'SUA_CHAVE_AQUI';");
    process.exit(1);
}

if (!SERPAPI_KEY || SERPAPI_KEY === "SUA_CHAVE_API_AQUI") {
    console.error("ERRO: A chave da SerpApi não está configurada em 'SERPAPI_KEY.js'.");
    process.exit(1);
}


// --- FUNÇÕES DE BUSCA (FETCH) ---

/**
 * Busca todos os repositórios de um usuário no GitHub.
 */
async function fetchGithubRepos() {
    console.log(`Buscando repositórios de '${GITHUB_USER}' no GitHub...`);
    let allRepos = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const url = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&page=${page}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erro na API do GitHub: ${response.statusText}`);
        }
        const repos = await response.json();
        if (repos.length > 0) {
            allRepos = allRepos.concat(repos);
            page++;
        } else {
            hasMore = false;
        }
    }

    console.log(`Total de ${allRepos.length} repositórios encontrados.`);
    // Mapeia para o formato necessário
    return allRepos.map(repo => ({
        name: repo.name,
        html_url: repo.html_url,
        description: repo.description || "",
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        updated_at: repo.updated_at,
        topics: repo.topics || [],
    }));
}

/**
 * Busca o perfil e todas as publicações do Google Scholar via SerpApi.
 */
async function fetchScholarData() {
    console.log(`Buscando dados de '${SCHOLAR_USER_ID}' no Google Scholar...`);

    // 1. Busca os dados do perfil (métricas e gráfico)
    const profileParams = new URLSearchParams({
        engine: 'google_scholar_author',
        author_id: SCHOLAR_USER_ID,
        hl: 'pt-br',
        api_key: SERPAPI_KEY,
    });
    const profileUrl = `${PROXY_URL}${encodeURIComponent(`https://serpapi.com/search.json?${profileParams}`)}`;
    const profileResponse = await fetch(profileUrl);
    if (!profileResponse.ok) throw new Error(`Erro na SerpApi (Perfil): ${profileResponse.statusText}`);
    const profileData = await profileResponse.json();
    
    if (profileData.error) {
         throw new Error(`Erro da SerpApi (Perfil): ${profileData.error}`);
    }

    console.log("Métricas do perfil obtidas.");

    // 2. Busca todas as publicações (paginado)
    let allArticles = [];
    let start = 0;
    let hasMore = true;

    while (hasMore) {
        process.stdout.write(`Buscando publicações (iniciando do item ${start})...\r`);
        const articlesParams = new URLSearchParams({
            engine: 'google_scholar_author',
            author_id: SCHOLAR_USER_ID,
            hl: 'pt-br',
            start: start,
            num: 20, // SerpApi usa 'num' para o tamanho da página
            api_key: SERPAPI_KEY,
        });
        const articlesUrl = `${PROXY_URL}${encodeURIComponent(`https://serpapi.com/search.json?${articlesParams}`)}`;
        const articlesResponse = await fetch(articlesUrl);
        if (!articlesResponse.ok) throw new Error(`Erro na SerpApi (Artigos): ${articlesResponse.statusText}`);
        const articlesData = await articlesResponse.json();

        if (articlesData.error) {
            throw new Error(`Erro da SerpApi (Artigos): ${articlesData.error}`);
        }

        const articles = articlesData.articles || [];
        if (articles.length > 0) {
            allArticles = allArticles.concat(articles);
            start += 20;
        } else {
            hasMore = false;
        }
    }
    
    console.log(`\nTotal de ${allArticles.length} publicações encontradas.`);

    // 3. Monta o objeto final
    return {
        cited_by: profileData.cited_by,
        articles: allArticles.map(art => ({
            title: art.title,
            link: art.link,
            publication: art.publication,
            cited_by: art.cited_by || { value: 0 },
            snippet: art.snippet || "",
        })),
    };
}


// --- FUNÇÃO PRINCIPAL ---

async function updateFallbackFile() {
    try {
        console.log("Iniciando a atualização do arquivo de fallback...");

        // Busca os dados em paralelo
        const [githubRepos, scholarData] = await Promise.all([
            fetchGithubRepos(),
            fetchScholarData()
        ]);

        // Ordena os repositórios por estrelas
        githubRepos.sort((a, b) => b.stargazers_count - a.stargazers_count);
        // Ordena os artigos por citações
        scholarData.articles.sort((a, b) => (b.cited_by.value || 0) - (a.cited_by.value || 0));

        const newFallbackData = {
            github: { repos: githubRepos },
            scholar: scholarData,
        };

        const fileContent = `/**
 * fallback-data.js
 *
 * ATENÇÃO: Este arquivo é gerado automaticamente pelo script 'update-script.js'.
 * NÃO EDITE ESTE ARQUIVO MANUALMENTE, pois suas alterações serão sobrescritas.
 *
 * Última atualização: ${new Date().toISOString()}
 */

const fallbackData = ${JSON.stringify(newFallbackData, null, 2)};
`;

        fs.writeFileSync(FALLBACK_FILE_PATH, fileContent, 'utf-8');
        console.log(`\nArquivo '${FALLBACK_FILE_PATH}' atualizado com sucesso!`);

    } catch (error) {
        console.error("\n\n--- FALHA NA ATUALIZAÇÃO ---");
        console.error("Ocorreu um erro e o arquivo de fallback NÃO foi atualizado.");
        console.error("Detalhes do erro:", error.message);
        console.error("--------------------------");
    }
}

// Executa o script
updateFallbackFile();
