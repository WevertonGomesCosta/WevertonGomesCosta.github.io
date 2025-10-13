/**
 * @file busca_google_scholar.js
 * @description Script unificado para buscar, mesclar e exibir dados acadêmicos do ORCID e Google Scholar.
 * Funciona tanto na página principal (com métricas, gráfico e visualização limitada) quanto na
 * página de publicações (com listagem completa e filtros).
 * Utiliza dados de fallback em caso de falha na API.
 *
 * @version 4.0.0
 * @author Weverton G. Costa (Refatorado por Gemini)
 */

window.scholarScript = (function() {
    'use strict';

    // --- Configuração ---
    const SCHOLAR_USER_ID = "eJNKcHsAAAAJ";
    const ORCID_ID = "0000-0003-0742-5936";
    const PROXY_URL = 'https://corsproxy.io/?';
    const initialPubsToShow = 3;

    // --- Gerenciamento de Estado ---
    let allArticles = [];
    let citationGraphData = [];
    let showingPubsCount = initialPubsToShow;
    let isIndexPage = false;
    let activeYearFilter = null; // Para o filtro do gráfico

    // --- Seletores de Elementos DOM ---
    const UI = {
        citTotal: () => document.getElementById("cit-total"),
        citPeriod: () => document.getElementById("cit-period"),
        hTotal: () => document.getElementById("h-total"),
        hPeriod: () => document.getElementById("h-period"),
        i10Total: () => document.getElementById("i10-total"),
        i10Period: () => document.getElementById("i10-period"),
        scholarLink: () => document.querySelector(".scholar-link a"),
        scholarMetrics: () => document.querySelectorAll('.scholar-metrics .metric-value, .scholar-metrics .metric-value-period'),
        chartContainer: () => document.getElementById('interactive-scholar-chart-container'),
        pubsGrid: () => document.getElementById("publicacoes-grid"),
        pubSearchInput: () => document.getElementById('publication-search'),
        pubClearBtn: () => document.getElementById('publication-clear-btn'),
        pubsShownCount: () => document.getElementById('pubs-shown-count'),
        pubsToggleBtn: () => document.getElementById('pubs-toggle-more'),
    };

    // --- Funções Utilitárias ---
    const normalizeTitle = (str) => {
        if (!str) return '';
        return str.replace(/<[^>]+>/g, '').toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").replace(/\s\s+/g, ' ').trim();
    };

    function animateCountUp(el) {
        if (!el) return;
        const target = parseInt(el.textContent, 10);
        if (isNaN(target)) return;
        el.textContent = '0';
        let current = 0;
        const increment = Math.max(1, target / 100);
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
            return { title: work.title.title.value, doi, doiLink, year: work['publication-date']?.year?.value || '', journalTitle: work['journal-title']?.value || 'N/A', link: work.url?.value || doiLink };
        }).filter(Boolean);
    }

    // --- Funções de Renderização e UI ---
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
            if (window.fallbackData?.scholarData?.profile) {
                const { table, graph } = window.fallbackData.scholarData.profile.cited_by;
                UI.citTotal().textContent = table[0].citations.all;
                UI.citPeriod().textContent = table[0].citations.since_2020;
                UI.hTotal().textContent = table[1].h_index.all;
                UI.hPeriod().textContent = table[1].h_index.since_2020;
                UI.i10Total().textContent = table[2].i10_index.all;
                UI.i10Period().textContent = table[2].i10_index.since_2020;
                UI.scholarMetrics().forEach(animateCountUp);
                citationGraphData = graph || [];
            }
        }
    }
    
    function renderPublications() {
        const grid = UI.pubsGrid();
        if (!grid) return;
        const lang = window.currentLang || 'pt';
        const searchFilter = (UI.pubSearchInput()?.value || '').trim().toLowerCase();
        
        // Aplica o filtro de ano PRIMEIRO, se ele estiver ativo
        let baseList = activeYearFilter ? allArticles.filter(art => art.year === activeYearFilter.toString()) : allArticles;
        
        // Depois, aplica o filtro de busca de texto na lista já filtrada por ano
        const filteredArticles = searchFilter ? baseList.filter(art => normalizeTitle(art.title).includes(searchFilter) || (art.journalTitle || '').toLowerCase().includes(searchFilter) || (art.year || '').includes(searchFilter)) : baseList;

        const articlesToShow = isIndexPage ? filteredArticles.slice(0, showingPubsCount) : filteredArticles;
        grid.innerHTML = "";
        if (articlesToShow.length === 0) {
            grid.innerHTML = `<div class="card" style="grid-column: 1 / -1;"><p>${translations[lang].no_pubs_found}</p></div>`;
        } else {
            articlesToShow.forEach(art => grid.appendChild(createPublicationCard(art, lang)));
        }
        updatePubsCount(articlesToShow.length, filteredArticles.length);
        updateToggleMoreButton(articlesToShow.length, filteredArticles.length);
    }
    
    function createPublicationCard(art, lang) {
        const card = document.createElement("div");
        card.className = "card publication-card";
        const citationText = art.cited_by?.value ? `${translations[lang]['pub-cited-by']} ${art.cited_by.value} ${translations[lang]['pub-cited-by-times']}` : translations[lang]['pub-no-citation'];
        const doiHtml = art.doi ? `<div class="publication-doi"><a href="${art.doiLink}" target="_blank" rel="noopener" title="DOI: ${art.doi}"><img src="https://upload.wikimedia.org/wikipedia/commons/1/11/DOI_logo.svg" alt="DOI logo"/></a><a href="${art.doiLink}" target="_blank" rel="noopener">${art.doi}</a></div>` : '';
        card.innerHTML = `<h3>${art.title.replace(/<[^>]+>/g, '')}</h3> ${doiHtml} <p class="publication-meta">${translations[lang]['pub-published']}: ${art.year} ${translations[lang]['pub-in']} <em>${art.journalTitle}</em></p><p class="citations">${citationText}</p><a href="${art.link || art.doiLink}" target="_blank" rel="noopener" class="publication-link">${translations[lang]['pub-read']}</a>`;
        return card;
    }

    // --- NOVA LÓGICA DO GRÁFICO ---
    function _animateChart(graphData, articles) {
        const containerId = 'interactive-scholar-chart-container';
        const container = document.getElementById(containerId);
        const yearlyData = {};
        
        (graphData || []).forEach(item => { yearlyData[item.year] = { citations: item.citations || 0, pubs: 0 }; });
        (articles || []).forEach(article => {
            const year = parseInt(article.year);
            if (year) {
                if (yearlyData[year]) { yearlyData[year].pubs++; } else { yearlyData[year] = { citations: 0, pubs: 1 }; }
            }
        });
        
        const sortedYears = Object.keys(yearlyData).filter(year => yearlyData[year].pubs > 0 || yearlyData[year].citations > 0).sort((a, b) => a - b);
        if (sortedYears.length === 0) { return; }

        const fullYears = sortedYears, fullCitCounts = sortedYears.map(y => yearlyData[y].citations || 0), fullPubCounts = sortedYears.map(y => yearlyData[y].pubs || 0);
        const maxPubs = Math.max(...fullPubCounts, 1), fullScaledPubCounts = fullPubCounts.map(p => Math.max(10, (p / maxPubs) * 40));
        const fullCustomData = sortedYears.map(y => ({ pubs: yearlyData[y].pubs || 0 }));
        
        const isMobile = window.innerWidth < 768, maxCitation = Math.max(...fullCitCounts, 0);
        const chartTitle = isMobile ? translations[currentLang]['chart-title-mobile'] : translations[currentLang]['chart-title'];
        const yAxisMin = maxCitation > 5 ? -maxCitation * 0.1 : -1;

        const layout = {
            title: { text: chartTitle, x: 0.5, xanchor: 'center', y: 0.95, yanchor: 'top', font: { size: isMobile ? 16 : 18, color: 'var(--text)' } },
            paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { color: 'var(--text-muted)', family: 'inherit' }, dragmode: false,
            xaxis: { title: { text: translations[currentLang]['chart-xaxis-title'], font: { size: isMobile ? 10 : 12 }}, gridcolor: 'var(--border)', gridwidth: 1, griddash: 'dot', zeroline: false, showline: true, linecolor: 'var(--border)', tickvals: fullYears, ticktext: fullYears, fixedrange: true, tickangle: isMobile ? -60 : -45, tickfont: { size: isMobile ? 8 : 10 }, automargin: true },
            yaxis: { title: { text: translations[currentLang]['chart-yaxis-title'], font: { size: isMobile ? 10 : 12 }}, gridcolor: 'var(--border)', gridwidth: 1, griddash: 'dot', zeroline: false, showline: true, linecolor: 'var(--border)', range: [yAxisMin, maxCitation === 0 ? 10 : maxCitation * 1.1], fixedrange: true, tickfont: { size: isMobile ? 8 : 10 }, automargin: true },
            margin: { l: isMobile ? 50 : 80, r: isMobile ? 20 : 40, b: isMobile ? 100 : 80, t: 80 }, hovermode: 'closest', showlegend: false, autosize: true
        };
        const config = { responsive: true, displaylogo: false, scrollZoom: false, modeBarButtonsToRemove: ['toImage', 'zoom2d', 'pan2d', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d', 'toggleSpikelines'] };
        const bubbleTrace = { x: fullYears, y: [], customdata: [], hovertemplate: '<b>Ano: %{x}</b><br>Citações: <b>%{y}</b><br>Publicações: <b>%{customdata.pubs}</b><extra></extra>', mode: 'markers', marker: { size: [], color: [], colorscale: [['0.0', 'rgba(16, 185, 129, 0.3)'], ['1.0', 'rgba(16, 185, 129, 1.0)']], showscale: true, colorbar: { title: translations[currentLang]['chart-colorbar-title'], thickness: 10, len: isMobile ? 0.75 : 0.9, x: isMobile ? 0.5 : 1.02, xanchor: isMobile ? 'center' : 'left', y: isMobile ? -0.5 : 0.5, yanchor: isMobile ? 'bottom' : 'middle', orientation: isMobile ? 'h' : 'v', tickfont: { color: 'var(--text-muted)', size: isMobile ? 8 : 10 }, titlefont: { color: 'var(--text-muted)', size: isMobile ? 10 : 12 }, outlinecolor: 'var(--border)' } } };
        const lineTrace = { x: fullYears, y: [], type: 'scatter', mode: 'lines', line: { color: 'var(--accent)', width: 2, shape: 'spline', smoothing: 0.7 }, hoverinfo: 'none' };

        Plotly.newPlot(containerId, [bubbleTrace, lineTrace], layout, config).then(gd => {
            gd.on('plotly_click', data => {
                if (data.points.length > 0) {
                    const clickedYear = data.points[0].x;
                    activeYearFilter = (activeYearFilter === clickedYear) ? null : clickedYear;
                    document.getElementById('publication-search').value = '';
                    renderPublications(); 
                    updateFilterUI();
                }
            });
            let frame = 0;
            function runAnimation() {
                if (frame >= fullYears.length) return;
                const slice = arr => arr.slice(0, frame + 1);
                Plotly.restyle(gd, { y: [slice(fullCitCounts), slice(fullCitCounts)], customdata: [slice(fullCustomData)], 'marker.size': [slice(fullScaledPubCounts)], 'marker.color': [slice(fullPubCounts)] });
                frame++; setTimeout(runAnimation, 150);
            }
            setTimeout(runAnimation, 300);
        });
    }

    function renderInteractiveChart(graphData, articles) {
        const container = UI.chartContainer();
        if (!container) return;

        if (typeof Plotly === 'undefined') {
            setTimeout(() => renderInteractiveChart(graphData, articles), 250);
            return;
        }

        if ((!graphData || graphData.length === 0) && (!articles || articles.length === 0)) {
            container.innerHTML = `<div class="card" style="color: var(--text-muted);">${translations[currentLang]['chart-no-data'] || 'Dados para o gráfico não disponíveis.'}</div>`;
            return;
        }

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => { if (entry.isIntersecting) { _animateChart(graphData, articles); obs.unobserve(entry.target); } });
        }, { threshold: 0.5 });
        observer.observe(container);
    }
    
    function updateFilterUI() {
        const controlsContainer = document.querySelector('#publicacoes .controls');
        let filterChip = document.getElementById('year-filter-chip');
        if (activeYearFilter) {
            if (!filterChip) {
                filterChip = document.createElement('div');
                filterChip.id = 'year-filter-chip';
                filterChip.style.cssText = 'background: var(--primary); color: var(--dark); padding: 8px 12px; border-radius: 20px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;';
                controlsContainer.appendChild(filterChip);
            }
            filterChip.innerHTML = `<span>Filtrando por: ${activeYearFilter}</span><button style="background:none;border:none;color:var(--dark);font-size:1.2rem;cursor:pointer;line-height:1;">&times;</button>`;
            filterChip.querySelector('button').onclick = () => {
                activeYearFilter = null;
                renderPublications();
                updateFilterUI();
            };
        } else {
            if (filterChip) filterChip.remove();
        }
    }

    // --- Funções de Inicialização e Eventos ---
    function updatePubsCount(shown, total) {
        const countEl = UI.pubsShownCount();
        if (countEl) countEl.textContent = translations[currentLang].showing_pubs(shown, total);
    }
    
    function updateToggleMoreButton(shown, total) {
        const toggleBtn = UI.pubsToggleBtn();
        if (toggleBtn) {
            const hasMore = shown < total;
            toggleBtn.style.display = (isIndexPage && hasMore) ? 'inline-block' : 'none';
            toggleBtn.textContent = hasMore ? translations[currentLang]['show-more'] : translations[currentLang]['show-less'];
        }
    }

    async function initializePublications() {
        const grid = UI.pubsGrid();
        if (!grid) return;
        grid.innerHTML = Array(isIndexPage ? 3 : 6).fill('<div class="skeleton-card"></div>').join('');
        
        try {
            const [orcidWorks, scholarArticles] = await Promise.all([ fetchOrcidWorks(), fetchAllScholarArticles() ]);
            const scholarMap = new Map(scholarArticles.map(art => [normalizeTitle(art.title), { cited_by: art.cited_by, link: art.link }]));
            const merged = orcidWorks.map(work => ({ ...work, ...scholarMap.get(normalizeTitle(work.title)) }));
            allArticles = merged.sort((a, b) => (b.cited_by?.value || 0) - (a.cited_by?.value || 0));
        } catch (e) {
            console.warn("API do Scholar/ORCID falhou, usando fallback para publicações:", e.message);
            if (window.fallbackData?.scholarData?.articles) {
                allArticles = window.fallbackData.scholarData.articles;
            } else {
                grid.innerHTML = `<div class="card" style="color: var(--error); grid-column: 1 / -1;">${translations[currentLang].fetch_pub_error}: ${e.message}</div>`;
                return;
            }
        }
        renderPublications();
    }
    
    function attachEventListeners() {
        const searchInput = UI.pubSearchInput();
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                showingPubsCount = initialPubsToShow; // Reseta a contagem ao buscar
                renderPublications();
            });
        }
        
        const clearBtn = UI.pubClearBtn();
        if (clearBtn && searchInput) {
            clearBtn.addEventListener('click', () => { 
                searchInput.value = '';
                showingPubsCount = initialPubsToShow;
                if (activeYearFilter) {
                    activeYearFilter = null;
                    updateFilterUI();
                }
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

    async function init() {
        isIndexPage = !!UI.chartContainer();
        if (!isIndexPage) showingPubsCount = Infinity;
        
        attachEventListeners();
        
        if (isIndexPage) {
            await Promise.all([ updateScholarMetrics(), initializePublications() ]);
            // A chamada para o gráfico é feita aqui, após todos os dados estarem disponíveis
            renderInteractiveChart(citationGraphData, allArticles);
        } else {
            await initializePublications();
        }
    }
    
    // --- Interface Pública ---
    return { init };
})();

// --- Ponto de Entrada do Script ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.scholarScript.init);
} else {
    window.scholarScript.init();
}

