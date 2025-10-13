/**
 * @file busca_google_scholar.js
 * @description Script unificado para buscar, mesclar e exibir dados acadêmicos do ORCID e Google Scholar.
 * Funciona tanto na página principal (com métricas, gráfico e visualização limitada) quanto na
 * página de publicações (com listagem completa e filtros).
 * Utiliza dados de fallback em caso de falha na API.
 *
 * @version 3.0.0
 * @author Weverton G. Costa (Refatorado por Gemini)
 */

// --- Módulo Principal da Aplicação ---
window.scholarScript = (function() {
    'use strict';

    // --- Configuração ---
    const SCHOLAR_USER_ID = "eJNKcHsAAAAJ";
    const ORCID_ID = "0000-0003-0742-5936";
    const PROXY_URL = 'https://corsproxy.io/?';
    const initialPubsToShow = 3; // Quantidade de publicações na página inicial

    // --- Gerenciamento de Estado ---
    let allArticles = [];
    let citationGraphData = [];
    let showingPubsCount = initialPubsToShow;
    let isIndexPage = false; // Flag para identificar a página

    // --- Seletores de Elementos DOM ---
    // Funções que retornam o elemento para evitar erros se ele não existir em uma das páginas
    const UI = {
        // Métricas do Scholar (index)
        citTotal: () => document.getElementById("cit-total"),
        citPeriod: () => document.getElementById("cit-period"),
        hTotal: () => document.getElementById("h-total"),
        hPeriod: () => document.getElementById("h-period"),
        i10Total: () => document.getElementById("i10-total"),
        i10Period: () => document.getElementById("i10-period"),
        scholarLink: () => document.querySelector(".scholar-link a"),
        scholarMetrics: () => document.querySelectorAll('.scholar-metrics .metric-value, .scholar-metrics .metric-value-period'),
        scholarCard: () => document.querySelector(".scholar-summary-card"),
        chartContainer: () => document.getElementById('interactive-scholar-chart-container'),
        
        // Publicações (ambas as páginas)
        pubsGrid: () => document.getElementById("publicacoes-grid"),
        pubSearchInput: () => document.getElementById('publication-search'),
        pubClearBtn: () => document.getElementById('publication-clear-btn'),
        pubsShownCount: () => document.getElementById('pubs-shown-count'),
        pubsToggleBtn: () => document.getElementById('pubs-toggle-more'),
    };

    // --- Funções Utilitárias ---

    /**
     * Normaliza um título para comparação, removendo HTML, pontuação e espaços extras.
     * @param {string} str - A string a ser normalizada.
     * @returns {string} A string normalizada.
     */
    const normalizeTitle = (str) => {
        if (!str) return '';
        return str.replace(/<[^>]+>/g, '').toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").replace(/\s\s+/g, ' ').trim();
    };

    /**
     * Anima um número de 0 até o valor alvo.
     * @param {HTMLElement} el - O elemento a ser animado.
     */
    function animateCountUp(el) {
        if (!el) return;
        const target = parseInt(el.textContent, 10);
        if (isNaN(target)) return;
        el.textContent = '0';
        let current = 0;
        const increment = target / 100;
        const interval = setInterval(() => {
            current += increment;
            if (current >= target) {
                el.textContent = target;
                clearInterval(interval);
            } else {
                el.textContent = Math.ceil(current);
            }
        }, 20);
    }
    
    // --- Funções da API ---

    /**
     * Busca dados da SerpApi com tratamento de erros.
     * @param {object} params - Parâmetros para a busca.
     * @returns {Promise<object>} A resposta da API.
     */
    async function fetchFromSerpApi(params) {
        if (typeof SERPAPI_KEY === 'undefined' || !SERPAPI_KEY) {
            throw new Error("Chave da API (SERPAPI_KEY) não foi configurada.");
        }
        const baseUrl = 'https://serpapi.com/search.json';
        const searchParams = new URLSearchParams({ ...params, api_key: SERPAPI_KEY });
        const apiUrl = `${baseUrl}?${searchParams.toString()}`;
        
        const res = await fetch(`${PROXY_URL}${encodeURIComponent(apiUrl)}`);
        
        if (!res.ok) {
            const errorText = await res.text();
            if (errorText.includes("monthly search limit")) {
                throw new Error(translations[currentLang]['serpapi-limit-msg'] || "Limite de buscas da SerpApi atingido.");
            }
            throw new Error(`Falha na requisição: ${res.status}.`);
        }
        return await res.json();
    }

    /**
     * Busca todos os artigos do Google Scholar, paginando os resultados.
     * @returns {Promise<Array<object>>} Uma lista de artigos.
     */
    async function fetchAllScholarArticles() {
        let start = 0, allResults = [], hasMore = true;
        while (hasMore) {
            try {
                const result = await fetchFromSerpApi({ engine: 'google_scholar_author', author_id: SCHOLAR_USER_ID, hl: 'pt-BR', start: start, num: 20 });
                if (result.error) throw new Error(result.error);
                
                const articles = result.articles || [];
                if (articles.length === 0) {
                    hasMore = false;
                } else {
                    allResults = allResults.concat(articles);
                    start += 20;
                }
            } catch (e) {
                console.error(`Erro ao buscar publicações (página ${start / 20 + 1}):`, e);
                hasMore = false; 
                if (allResults.length === 0) throw e;
            }
        }
        return allResults;
    }
    
    /**
     * Busca os trabalhos do ORCID.
     * @returns {Promise<Array<object>>} Uma lista de trabalhos.
     */
    async function fetchOrcidWorks() {
        const API_URL = `https://pub.orcid.org/v3.0/${ORCID_ID}/works`;
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(API_URL)}`, { headers: { 'Accept': 'application/json' }});
        if (!response.ok) throw new Error(`Falha ao buscar dados do ORCID: ${response.status}`);
        
        const data = await response.json();
        return data.group.map(item => {
            const work = item['work-summary'][0];
            if (!work?.title?.title?.value) return null;
            
            const doiObject = work['external-ids']?.['external-id']?.find(id => id['external-id-type'] === 'doi');
            const doi = doiObject?.['external-id-value'] || null;
            const doiLink = doiObject?.['external-id-url']?.value || (doi ? `https://doi.org/${doi}` : null);
            
            return {
                title: work.title.title.value,
                doi,
                doiLink,
                year: work['publication-date']?.year?.value || '',
                journalTitle: work['journal-title']?.value || 'N/A',
                link: work.url?.value || doiLink,
            };
        }).filter(Boolean); // Remove nulos
    }

    // --- Funções de Renderização e UI ---

    /**
     * Atualiza as métricas do Scholar na página principal.
     */
    async function updateScholarMetrics() {
        try {
            const profile = await fetchFromSerpApi({ engine: 'google_scholar_author', author_id: SCHOLAR_USER_ID, hl: 'pt-BR' });
            if (profile.error) throw new Error(profile.error);

            citationGraphData = profile.cited_by?.graph || [];
            
            const metricsTable = profile.cited_by?.table;
            if (!metricsTable) throw new Error("Dados de citação não encontrados.");

            const updateMetric = (el, periodEl, data) => {
                if (el) el.textContent = data?.all ?? '—';
                if (periodEl) {
                    const sinceKey = Object.keys(data || {}).find(k => k.startsWith('since_'));
                    periodEl.textContent = sinceKey ? data[sinceKey] : '—';
                }
            };
            
            updateMetric(UI.citTotal(), UI.citPeriod(), metricsTable.find(item => item.citations)?.citations);
            updateMetric(UI.hTotal(), UI.hPeriod(), metricsTable.find(item => item.h_index)?.h_index);
            updateMetric(UI.i10Total(), UI.i10Period(), metricsTable.find(item => item.i10_index)?.i10_index);

            UI.scholarMetrics().forEach(animateCountUp);
            const scholarLink = UI.scholarLink();
            if (scholarLink && profile.author_url) scholarLink.href = profile.author_url;

        } catch (e) {
            console.warn("API do Scholar falhou, usando fallback para métricas:", e.message);
            // Lógica de Fallback para Métricas
            if (window.fallbackData?.scholarData?.profile) {
                const { table } = window.fallbackData.scholarData.profile.cited_by;
                UI.citTotal().textContent = table[0].citations.all;
                UI.citPeriod().textContent = table[0].citations.since_2020;
                UI.hTotal().textContent = table[1].h_index.all;
                UI.hPeriod().textContent = table[1].h_index.since_2020;
                UI.i10Total().textContent = table[2].i10_index.all;
                UI.i10Period().textContent = table[2].i10_index.since_2020;
                UI.scholarMetrics().forEach(animateCountUp);
            }
        }
    }
    
    /**
     * Renderiza a lista de publicações na grid.
     */
    function renderPublications() {
        const grid = UI.pubsGrid();
        if (!grid) return;
        
        const lang = window.currentLang || 'pt';
        const searchFilter = (UI.pubSearchInput()?.value || '').trim().toLowerCase();
        
        const filteredArticles = searchFilter
            ? allArticles.filter(art => 
                normalizeTitle(art.title).includes(searchFilter) ||
                (art.journalTitle || '').toLowerCase().includes(searchFilter) ||
                (art.year || '').includes(searchFilter)
              )
            : allArticles;

        const articlesToShow = isIndexPage ? filteredArticles.slice(0, showingPubsCount) : filteredArticles;

        grid.innerHTML = ""; // Limpa a grid

        if (articlesToShow.length === 0) {
            grid.innerHTML = `<div class="card" style="grid-column: 1 / -1;"><p>${translations[lang].no_pubs_found}</p></div>`;
        } else {
            articlesToShow.forEach(art => grid.appendChild(createPublicationCard(art, lang)));
        }

        updatePubsCount(articlesToShow.length, filteredArticles.length);
        updateToggleMoreButton(articlesToShow.length, filteredArticles.length);
    }
    
    /**
     * Cria o HTML para um card de publicação.
     * @param {object} art - O objeto do artigo.
     * @param {string} lang - O idioma atual.
     * @returns {HTMLElement} O elemento do card.
     */
    function createPublicationCard(art, lang) {
        const card = document.createElement("div");
        card.className = "card publication-card";

        const citationText = art.cited_by?.value 
            ? `${translations[lang]['pub-cited-by']} ${art.cited_by.value} ${translations[lang]['pub-cited-by-times']}`
            : translations[lang]['pub-no-citation'];
        
        const doiHtml = art.doi ? `
            <div class="publication-doi">
                <a href="${art.doiLink}" target="_blank" rel="noopener" title="DOI: ${art.doi}">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/1/11/DOI_logo.svg" alt="DOI logo"/>
                </a>
                <a href="${art.doiLink}" target="_blank" rel="noopener">${art.doi}</a>
            </div>` : '';

        card.innerHTML = `
            <h3>${art.title.replace(/<[^>]+>/g, '')}</h3>
            ${doiHtml}
            <p class="publication-meta">${translations[lang]['pub-published']}: ${art.year} ${translations[lang]['pub-in']} <em>${art.journalTitle}</em></p>
            <p class="citations">${citationText}</p>
            <a href="${art.link || art.doiLink}" target="_blank" rel="noopener" class="publication-link">${translations[lang]['pub-read']}</a>
        `;
        return card;
    }

    /**
     * Renderiza o gráfico interativo na página principal.
     */
    function renderInteractiveChart() {
        const container = UI.chartContainer();
        if (!container || typeof Plotly === 'undefined' || !citationGraphData || citationGraphData.length === 0) {
            return;
        }
        
        const years = citationGraphData.map(d => d.year);
        const citations = citationGraphData.map(d => d.citations);

        const trace = {
            x: years,
            y: citations,
            type: 'bar',
            marker: {
                color: 'rgba(16, 185, 129, 0.7)',
                line: {
                    color: 'var(--primary)',
                    width: 1.5
                }
            }
        };

        const layout = {
            title: translations[currentLang]['chart-title'] || 'Citations per Year',
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: 'var(--text-muted)' },
            xaxis: { gridcolor: 'var(--border)' },
            yaxis: { gridcolor: 'var(--border)' }
        };

        Plotly.newPlot(container, [trace], layout, {responsive: true, displaylogo: false});
    }
    
    // --- Funções Auxiliares da UI ---

    function updatePubsCount(shown, total) {
        const countEl = UI.pubsShownCount();
        if (countEl) {
            countEl.textContent = translations[currentLang].showing_pubs(shown, total);
        }
    }
    
    function updateToggleMoreButton(shown, total) {
        const toggleBtn = UI.pubsToggleBtn();
        if (toggleBtn) {
            const hasMore = shown < total;
            toggleBtn.style.display = hasMore ? 'inline-block' : 'none';
            toggleBtn.textContent = hasMore ? translations[currentLang]['show-more'] : translations[currentLang]['show-less'];
        }
    }

    /**
     * Carrega os dados de publicações da API ou do fallback.
     */
    async function initializePublications() {
        const grid = UI.pubsGrid();
        if (!grid) return;
        
        grid.innerHTML = Array(isIndexPage ? 3 : 6).fill('<div class="skeleton-card"></div>').join('');
        
        try {
            const [orcidWorks, scholarArticles] = await Promise.all([
                fetchOrcidWorks(),
                fetchAllScholarArticles()
            ]);

            const scholarMap = new Map(scholarArticles.map(art => [normalizeTitle(art.title), { cited_by: art.cited_by, link: art.link }]));

            const merged = orcidWorks.map(work => {
                const scholarData = scholarMap.get(normalizeTitle(work.title));
                return { ...work, ...scholarData };
            });

            allArticles = merged.sort((a, b) => (b.cited_by?.value || 0) - (a.cited_by?.value || 0));

        } catch (e) {
            console.warn("API do Scholar/ORCID falhou, usando fallback para publicações:", e.message);
            // Lógica de Fallback para Publicações
            if (window.fallbackData?.scholarData?.articles) {
                allArticles = window.fallbackData.scholarData.articles;
            } else {
                grid.innerHTML = `<div class="card" style="color: var(--error); grid-column: 1 / -1;">${translations[currentLang].fetch_pub_error}: ${e.message}</div>`;
                return;
            }
        }
        
        renderPublications();
        if (isIndexPage) {
            renderInteractiveChart();
        }
    }
    
    /**
     * Anexa os ouvintes de eventos necessários.
     */
    function attachEventListeners() {
        const searchInput = UI.pubSearchInput();
        if (searchInput) {
            searchInput.addEventListener('input', () => renderPublications());
        }

        const clearBtn = UI.pubClearBtn();
        if (clearBtn && searchInput) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                renderPublications();
            });
        }
        
        const toggleBtn = UI.pubsToggleBtn();
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                showingPubsCount += 3;
                renderPublications();
            });
        }
    }

    /**
     * Função pública de inicialização.
     */
    function init() {
        // Detecta em qual página estamos
        isIndexPage = !!UI.chartContainer();
        
        if (!isIndexPage) {
            showingPubsCount = Infinity; // Na página de publicações, mostramos tudo
        }

        // Carrega dados e anexa eventos
        if (isIndexPage) {
            updateScholarMetrics();
        }
        initializePublications();
        attachEventListeners();
    }
    
    // --- Interface Pública ---
    return {
        init: init,
        renderPublications: renderPublications, // Expõe para ser chamado por outros scripts se necessário
        get allArticles() { return allArticles; }
    };

})();

// --- Ponto de Entrada do Script ---
// Garante que o DOM esteja pronto antes de executar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.scholarScript.init);
} else {
    window.scholarScript.init();
}
