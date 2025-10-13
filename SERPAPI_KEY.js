/**
 * @file scholar_script.js
 * @description Handles fetching, merging, and displaying academic data from ORCID and Google Scholar.
 * This script creates an interactive chart and a filterable list of publications.
 *
 * @version 2.1.0
 * @author Refactored by Gemini
 *
 * @note In a real-world production environment, API keys MUST NOT be exposed on the client-side.
 * This script assumes a backend proxy is used to securely handle API requests and protect sensitive keys.
 */

// --- Configuration ---
// Este arquivo contém a chave da API. Em um ambiente de produção real,
// esta chave NUNCA deve ser exposta no lado do cliente.
const SERPAPI_KEY = "77282a568959bc1c31cdf88333aaab9768aa7d8ed9db90bd17e5db5a2f08c9f1";
const SCHOLAR_USER_ID = "eJNKcHsAAAAJ";
const ORCID_ID = "0000-0003-0742-5936";
const PROXY_URL = 'https://corsproxy.io/?'; // Used for services without a dedicated backend proxy.

// --- Main Application Module ---
window.scholarScript = (function() {

    // --- State Management ---
    let allArticles = [];
    let showingPubsCount = 3;
    let citationGraphData = [];
    let activeYearFilter = null;
    let currentLang = 'pt'; // Assuming 'pt' is the default, can be updated dynamically.

    // --- DOM Element Selectors ---
    const UI = {
        citTotal: () => document.getElementById("cit-total"),
        citPeriod: () => document.getElementById("cit-period"),
        hTotal: () => document.getElementById("h-total"),
        hPeriod: () => document.getElementById("h-period"),
        i10Total: () => document.getElementById("i10-total"),
        i10Period: () => document.getElementById("i10-period"),
        scholarLink: () => document.querySelector(".scholar-link a"),
        scholarMetrics: () => document.querySelectorAll('.scholar-metrics .metric-value, .scholar-metrics .metric-value-period'),
        scholarCard: () => document.querySelector(".scholar-summary-card"),
        pubsGrid: () => document.getElementById("publicacoes-grid"),
        pubsToggleBtn: () => document.getElementById('pubs-toggle-more'),
        pubsShownCount: () => document.getElementById('pubs-shown-count'),
        pubSearchInput: () => document.getElementById('publication-search'),
        chartContainer: () => document.getElementById('interactive-scholar-chart-container'),
        pubsControlsContainer: () => document.querySelector('#publicacoes .controls')
    };

    // --- Utility Functions ---

    /**
     * Normalizes a string by removing HTML tags, punctuation, and extra spaces, and converting to lower case.
     * @param {string} str The string to normalize.
     * @returns {string} The normalized string.
     */
    const normalizeTitle = (str) => (str || '').replace(/<[^>]+>/g, '').toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").replace(/\s\s+/g, ' ').trim();

    /**
     * Animates a number counting up from 0 to a target value.
     * @param {HTMLElement} el The element whose text content will be animated.
     */
    function animateCountUp(el) {
        const target = parseInt(el.textContent, 10);
        if (isNaN(target)) {
            el.textContent = '—';
            return;
        }
        if (target === 0) {
            el.textContent = '0';
            return;
        }
        const duration = 2000;
        const intervalTime = 20;
        const steps = duration / intervalTime;
        const increment = target / steps;
        let current = 0;
        el.textContent = '0';
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                el.textContent = target;
                clearInterval(timer);
            } else {
                el.textContent = Math.ceil(current);
            }
        }, intervalTime);
    }

    // --- API Service Functions ---

    /**
     * Fetches data from the SerpApi, with exponential backoff for rate limiting.
     * @param {object} params - The parameters for the SerpApi search.
     * @returns {Promise<object>} - A promise that resolves with the JSON response from the API.
     */
    async function fetchFromSerpApi(params) {
        if (typeof SERPAPI_KEY === 'undefined' || !SERPAPI_KEY) {
            throw new Error("Chave da API (SERPAPI_KEY) não configurada.");
        }
        const baseUrl = 'https://serpapi.com/search.json';
        const searchParams = new URLSearchParams({ ...params, api_key: SERPAPI_KEY });
        const apiUrl = `${baseUrl}?${searchParams.toString()}`;

        let lastError = null;
        let delay = 1000; // Initial delay of 1 second
        const maxRetries = 5;

        for (let i = 0; i < maxRetries; i++) {
            try {
                const res = await fetch(`${PROXY_URL}${encodeURIComponent(apiUrl)}`);

                if (res.ok) {
                    return await res.json(); // Success
                }

                if (res.status === 429) { // Too Many Requests
                    console.warn(`Rate limit atingido. Tentando novamente em ${delay / 1000}s... (Tentativa ${i + 1}/${maxRetries})`);
                    lastError = new Error(`Muitas requisições (Erro 429).`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Double the delay for the next retry
                    continue; // Go to the next iteration
                }

                // For other errors, fail immediately
                const errorText = await res.text();
                console.error("Erro da API ou do Proxy:", errorText);
                if (errorText.includes("monthly search limit")) {
                    throw new Error(translations[currentLang]['serpapi-limit-msg']);
                }
                throw new Error(`Falha na requisição. Status: ${res.status}.`);

            } catch (error) {
                lastError = error;
                console.error(`Erro de rede na tentativa ${i + 1}:`, error);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            }
        }

        console.error("Erro ao buscar dados do Google Scholar após múltiplas tentativas:", lastError);
        throw lastError; // Throw the last captured error
    }
    
    /**
     * Fetches all publications for the configured Google Scholar user ID.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of article objects.
     */
    async function fetchAllScholarArticles() {
        let start = 0,
            allResults = [],
            hasMore = true;
        while (hasMore) {
            try {
                const result = await fetchFromSerpApi({
                    engine: 'google_scholar_author',
                    author_id: SCHOLAR_USER_ID,
                    hl: 'pt-BR',
                    start: start,
                    num: 20
                });
                if (result.error) throw new Error(result.error);
                
                const articles = result.articles || [];
                if (articles.length === 0) {
                    hasMore = false;
                } else {
                    allResults = allResults.concat(articles);
                    start += 20;
                }
            } catch (e) {
                console.error(`Erro ao buscar publicações (start=${start}):`, e);
                hasMore = false; // Stop pagination on error
                if (allResults.length === 0) throw e; // Re-throw if no articles were fetched at all
            }
        }
        return allResults;
    }
    
    /**
     * Fetches works from the ORCID public API.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of work objects.
     */
    async function fetchOrcidWorks() {
        const API_URL = `https://pub.orcid.org/v3.0/${ORCID_ID}/works`;
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(API_URL)}`, {
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) {
            throw new Error(`Falha ao buscar dados do ORCID. Status: ${response.status}`);
        }
        const data = await response.json();
        const works = [];
        data.group.forEach(item => {
            const workSummary = item['work-summary'][0];
            if (!workSummary || !workSummary.title?.title?.value) return;

            const title = workSummary.title.title.value;
            let doi = null, doiLink = null;
            const externalIds = workSummary['external-ids']?.['external-id'];
            if (externalIds) {
                const doiObject = externalIds.find(id => id['external-id-type'] === 'doi');
                if (doiObject) {
                    doi = doiObject['external-id-value'];
                    doiLink = doiObject['external-id-url']?.value || `https://doi.org/${doi}`;
                }
            }
            const pubDate = workSummary['publication-date'];
            const year = pubDate?.year?.value || '';
            
            works.push({
                title: title,
                doi: doi,
                doiLink: doiLink,
                publication: `${workSummary['journal-title']?.value || ''}, ${year}`.replace(/, $/, ''),
                year: year,
                journalTitle: workSummary['journal-title']?.value || '',
                link: workSummary.url?.value || doiLink,
            });
        });
        return works;
    }


    // --- Rendering and UI Functions ---
    
    /**
     * Updates the scholar metrics section with data from the API.
     */
    async function updateScholarMetrics() {
        try {
            const profile = await fetchFromSerpApi({ engine: 'google_scholar_author', author_id: SCHOLAR_USER_ID });
            if (profile.error) throw new Error(profile.error);

            const { cited_by } = profile;
            if (!cited_by) throw new Error("Dados de citação ('cited_by') não encontrados.");

            if (cited_by.table && cited_by.table.length >= 3) {
                const citationsData = cited_by.table.find(item => item.citations)?.citations;
                const hIndexData = cited_by.table.find(item => item.h_index)?.h_index;
                const i10IndexData = cited_by.table.find(item => item.i10_index)?.i10_index;

                const updateMetric = (data, totalEl, periodEl) => {
                    if (data) {
                        totalEl.textContent = data.all ?? '—';
                        const sinceKey = Object.keys(data).find(k => k.startsWith('since_'));
                        periodEl.textContent = sinceKey ? data[sinceKey] : '—';
                    }
                };

                updateMetric(citationsData, UI.citTotal(), UI.citPeriod());
                updateMetric(hIndexData, UI.hTotal(), UI.hPeriod());
                updateMetric(i10IndexData, UI.i10Total(), UI.i10Period());
            } else if (cited_by.value) {
                UI.citTotal().textContent = cited_by.value ?? '—';
            } else {
                throw new Error("Dados de citação em formato inesperado.");
            }

            UI.scholarMetrics().forEach(animateCountUp);

            if (profile.author_url) {
                UI.scholarLink().href = profile.author_url;
            }
            if (profile.cited_by?.graph && Array.isArray(profile.cited_by.graph)) {
                citationGraphData = profile.cited_by.graph;
            }
        } catch (e) {
            console.error("Erro ao atualizar seção do Scholar:", e);
            const scholarCardEl = UI.scholarCard();
            if (scholarCardEl && !scholarCardEl.querySelector('.scholar-error')) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'scholar-error';
                errorDiv.style.cssText = 'color: var(--error); margin-top: 15px;';
                errorDiv.textContent = `${translations[currentLang]['error-loading-metrics']}: ${e.message}`;
                UI.scholarLink().parentElement.insertAdjacentElement('afterend', errorDiv);
            }
        }
    }

    /**
     * Renders the publications grid based on current filters and state.
     */
    function renderPublications() {
        const grid = UI.pubsGrid();
        const toggleBtn = UI.pubsToggleBtn();
        const shownCountEl = UI.pubsShownCount();
        const filter = UI.pubSearchInput().value.trim().toLowerCase();

        grid.innerHTML = "";

        let filteredByYear = activeYearFilter ?
            allArticles.filter(art => art.year === activeYearFilter.toString()) :
            allArticles;

        const filteredArticles = filter ?
            filteredByYear.filter(art =>
                Object.values(art).some(val => typeof val === 'string' && val.toLowerCase().includes(filter))
            ) :
            filteredByYear;

        const articlesToShow = filteredArticles.slice(0, showingPubsCount);

        if (articlesToShow.length === 0) {
            grid.innerHTML = `<div class="card" style="grid-column: 1 / -1;"><p>${translations[currentLang].no_pubs_found}</p></div>`;
            shownCountEl.textContent = `0 / 0`;
            toggleBtn.classList.add('hidden');
            return;
        }

        articlesToShow.forEach((art) => {
            const card = document.createElement("div");
            card.className = "card reveal publication-card";

            const citationText = art.cited_by?.value ?
                `${translations[currentLang]['pub-cited-by']} ${art.cited_by.value} ${translations[currentLang]['pub-cited-by-times']}` :
                translations[currentLang]['pub-no-citation'];

            const publicationMetaHtml = `<p class="publication-meta">${translations[currentLang]['pub-published']}: ${art.year} ${translations[currentLang]['pub-in']} <em>${art.journalTitle}</em></p>`;
            
            const doiHtml = art.doi ? `
                <div class="publication-doi">
                    <a href="https://doi.org/${art.doi}" target="_blank" rel="noopener" title="View on DOI.org">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/1/11/DOI_logo.svg" alt="DOI logo" style="height: 1.2em; vertical-align: middle;"/>
                    </a>
                    <a href="${art.doiLink}" target="_blank" rel="noopener">${art.doi}</a>
                </div>` : '';

            card.innerHTML = `
                <h3>${art.title.replace(/<[^>]+>/g, '')}</h3>
                ${doiHtml}
                ${publicationMetaHtml}
                <p class="citations">${citationText}</p>
                <a href="${art.link}" target="_blank" rel="noopener">${translations[currentLang]['pub-read']}</a>`;
            grid.appendChild(card);
        });

        shownCountEl.textContent = `${articlesToShow.length} / ${filteredArticles.length}`;
        toggleBtn.classList.toggle('hidden', articlesToShow.length >= filteredArticles.length);
        toggleBtn.textContent = translations[currentLang][articlesToShow.length >= filteredArticles.length ? 'show-less' : 'show-more'];
    }

    /**
     * Updates the UI to show or hide the year filter chip.
     */
    function updateFilterUI() {
        const controlsContainer = UI.pubsControlsContainer();
        let filterChip = document.getElementById('year-filter-chip');
        if (activeYearFilter) {
            if (!filterChip) {
                filterChip = document.createElement('div');
                filterChip.id = 'year-filter-chip';
                filterChip.style.cssText = 'background: var(--primary); color: var(--dark); padding: 8px 12px; border-radius: 20px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; margin-top: 10px;';
                controlsContainer.appendChild(filterChip);
            }
            filterChip.innerHTML = `<span>Filtrando por: ${activeYearFilter}</span><button style="background: none; border: none; color: var(--dark); font-size: 1.2rem; cursor: pointer; line-height: 1;">&times;</button>`;
            filterChip.querySelector('button').onclick = () => {
                activeYearFilter = null;
                renderPublications();
                updateFilterUI();
            };
        } else {
            if (filterChip) filterChip.remove();
        }
    }

    /**
     * Renders the interactive Plotly chart.
     * @param {Array<object>} graphData - Citation data per year from Google Scholar.
     * @param {Array<object>} articles - List of all articles to calculate publications per year.
     */
    function renderInteractiveChart(graphData, articles) {
        const container = UI.chartContainer();
        if (!container || typeof Plotly === 'undefined' || ((!graphData || graphData.length === 0) && (!articles || articles.length === 0))) {
            return;
        }

        // Use IntersectionObserver to animate chart only when it's visible
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateChart(container, graphData, articles);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        observer.observe(container);
    }

    /**
     * Prepares data and animates the Plotly chart.
     * @param {HTMLElement} container - The container element for the chart.
     * @param {Array<object>} graphData - Citation data.
     * @param {Array<object>} articles - Article data.
     */
    function animateChart(container, graphData, articles) {
        const yearlyData = {};
        (graphData || []).forEach(item => {
            yearlyData[item.year] = { citations: item.citations || 0, pubs: 0 };
        });
        (articles || []).forEach(article => {
            const yearMatches = (article.publication || '').match(/\b(19|20)\d{2}\b/g);
            if (yearMatches) {
                const year = parseInt(yearMatches[yearMatches.length - 1]);
                if (year) {
                    if (yearlyData[year]) {
                        yearlyData[year].pubs++;
                    } else {
                        yearlyData[year] = { citations: 0, pubs: 1 };
                    }
                }
            }
        });

        const sortedYears = Object.keys(yearlyData).filter(year => yearlyData[year].pubs > 0 || yearlyData[year].citations > 0).sort((a, b) => a - b);
        if (sortedYears.length === 0) return;

        const fullYears = sortedYears,
            fullCitCounts = sortedYears.map(y => yearlyData[y].citations || 0),
            fullPubCounts = sortedYears.map(y => yearlyData[y].pubs || 0);

        const maxPubs = Math.max(...fullPubCounts, 1);
        const fullScaledPubCounts = fullPubCounts.map(p => Math.max(10, (p / maxPubs) * 40));
        const fullCustomData = sortedYears.map(y => ({ pubs: yearlyData[y].pubs || 0 }));

        const isMobile = window.innerWidth < 768;
        const maxCitation = Math.max(...fullCitCounts, 0);
        const chartTitle = isMobile ? translations[currentLang]['chart-title-mobile'] : translations[currentLang]['chart-title'];

        const layout = {
            title: { text: chartTitle, x: 0.5, xanchor: 'center', y: 0.95, yanchor: 'top', font: { size: isMobile ? 16 : 18, color: 'var(--text)' } },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: 'var(--text-muted)', family: 'inherit' },
            dragmode: false,
            xaxis: { title: { text: translations[currentLang]['chart-xaxis-title'], font: { size: isMobile ? 10 : 12 } }, gridcolor: 'var(--border)', gridwidth: 1, griddash: 'dot', zeroline: false, showline: true, linecolor: 'var(--border)', tickvals: fullYears, ticktext: fullYears, fixedrange: true, tickangle: isMobile ? -60 : -45, tickfont: { size: isMobile ? 8 : 10 }, automargin: true },
            yaxis: { title: { text: translations[currentLang]['chart-yaxis-title'], font: { size: isMobile ? 10 : 12 } }, gridcolor: 'var(--border)', gridwidth: 1, griddash: 'dot', zeroline: false, showline: true, linecolor: 'var(--border)', range: [maxCitation > 5 ? -maxCitation * 0.1 : -1, maxCitation === 0 ? 10 : maxCitation * 1.1], fixedrange: true, tickfont: { size: isMobile ? 8 : 10 }, automargin: true },
            margin: { l: isMobile ? 50 : 80, r: isMobile ? 20 : 40, b: isMobile ? 100 : 80, t: 80 },
            hovermode: 'closest',
            showlegend: false,
            autosize: true
        };
        const config = { responsive: true, displaylogo: false, scrollZoom: false, modeBarButtonsToRemove: ['toImage', 'zoom2d', 'pan2d', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d', 'toggleSpikelines'] };
        const bubbleTrace = { x: fullYears, y: [], customdata: [], hovertemplate: '<b>Ano: %{x}</b><br>Citações: <b>%{y}</b><br>Publicações: <b>%{customdata.pubs}</b><extra></extra>', mode: 'markers', marker: { size: [], color: [], colorscale: [['0.0', 'rgba(16, 185, 129, 0.3)'], ['1.0', 'rgba(16, 185, 129, 1.0)']], showscale: true, colorbar: { title: translations[currentLang]['chart-colorbar-title'], thickness: 10, len: isMobile ? 0.75 : 0.9, x: isMobile ? 0.5 : 1.02, xanchor: isMobile ? 'center' : 'left', y: isMobile ? -0.5 : 0.5, yanchor: isMobile ? 'bottom' : 'middle', orientation: isMobile ? 'h' : 'v', tickfont: { color: 'var(--text-muted)', size: isMobile ? 8 : 10 }, titlefont: { color: 'var(--text-muted)', size: isMobile ? 10 : 12 }, outlinecolor: 'var(--border)' } } };
        const lineTrace = { x: fullYears, y: [], type: 'scatter', mode: 'lines', line: { color: 'var(--accent)', width: 2, shape: 'spline', smoothing: 0.7 }, hoverinfo: 'none' };

        Plotly.newPlot(container, [bubbleTrace, lineTrace], layout, config).then(gd => {
            gd.on('plotly_click', data => {
                if (data.points.length > 0) {
                    activeYearFilter = data.points[0].x;
                    UI.pubSearchInput().value = '';
                    renderPublications();
                    updateFilterUI();
                }
            });
            let frame = 0;
            const runAnimation = () => {
                if (frame >= fullYears.length) return;
                const slice = arr => arr.slice(0, frame + 1);
                Plotly.restyle(gd, {
                    y: [slice(fullCitCounts), slice(fullCitCounts)],
                    customdata: [slice(fullCustomData)],
                    'marker.size': [slice(fullScaledPubCounts)],
                    'marker.color': [slice(fullPubCounts)]
                });
                frame++;
                setTimeout(runAnimation, 150);
            };
            setTimeout(runAnimation, 300);
        });
    }
    
    // --- Main Data Loading and Initialization ---

    /**
     * Fetches and merges data from ORCID and Scholar, then renders the publications section.
     */
    async function initializePublications() {
        const grid = UI.pubsGrid();
        grid.innerHTML = `<div class="skeleton-card"></div>`.repeat(3);

        try {
            const [orcidWorks, scholarArticles] = await Promise.all([
                fetchOrcidWorks(),
                fetchAllScholarArticles()
            ]);

            const scholarCitationsMap = new Map();
            scholarArticles.forEach(art => {
                const normalizedTitle = normalizeTitle(art.title);
                if (!scholarCitationsMap.has(normalizedTitle)) {
                    scholarCitationsMap.set(normalizedTitle, { cited_by: art.cited_by, link: art.link });
                }
            });

            const mergedArticles = orcidWorks.map(work => {
                const normalizedTitle = normalizeTitle(work.title);
                const scholarData = scholarCitationsMap.get(normalizedTitle);
                return {
                    ...work,
                    cited_by: scholarData?.cited_by || null,
                    link: scholarData?.link || work.link,
                };
            });

            allArticles = mergedArticles.sort((a, b) => (b.cited_by?.value || 0) - (a.cited_by?.value || 0));
            
            renderPublications();
            const articlesForChart = scholarArticles.length > 0 ? scholarArticles : mergedArticles;
            renderInteractiveChart(citationGraphData, articlesForChart);
        } catch (e) {
            console.error("Error initializing publications:", e);
            const errorMsg = `${translations[currentLang]['error-loading-publications']}: ${e.message}`;
            grid.innerHTML = `<div class="card" style="color: var(--error); grid-column: 1 / -1;">${errorMsg}</div>`;
            UI.chartContainer().innerHTML = `<div class="card" style="color: var(--error);">${translations[currentLang]['error-loading-chart']}: ${e.message}</div>`;
        }
    }
    
    /**
     * Attaches all necessary event listeners.
     */
    function attachEventListeners() {
        UI.pubsToggleBtn().addEventListener('click', () => {
            showingPubsCount += 3;
            renderPublications();
        });

        UI.pubSearchInput().addEventListener('input', () => {
            // Debounce input to avoid excessive re-renders
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                renderPublications();
            }, 300);
        });
    }

    /**
     * Public init function to start the script.
     */
    function init() {
        // Load data in parallel
        updateScholarMetrics();
        initializePublications();
        
        // Setup UI interactions
        attachEventListeners();
    }
    
    // --- Public Interface ---
    return {
        init: init
    };

})();

// --- Script Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    // Ensure Plotly is loaded before initializing
    if (typeof Plotly !== 'undefined') {
        window.scholarScript.init();
    } else {
        console.error("Plotly.js is not loaded. The chart cannot be rendered.");
    }
});

