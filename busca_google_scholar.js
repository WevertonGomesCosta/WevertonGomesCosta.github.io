
// =================================================================================
// MÓDULO: GOOGLE SCHOLAR E PUBLICAÇÕES
// =================================================================================
const scholarScript = (function() {
    'use strict';
    const SCHOLAR_USER_ID = "eJNKcHsAAAAJ";
    const initialPubsToShow = 3;
    let allArticles = [];
    let citationGraphData = [];
    let showingPubsCount = initialPubsToShow;
    let isIndexPage = false;
    let activeYearFilter = null;

    const UI = {
        citTotal: () => document.getElementById("cit-total"),
        citPeriod: () => document.getElementById("cit-period"),
        hTotal: () => document.getElementById("h-total"),
        hPeriod: () => document.getElementById("h-period"),
        i10Total: () => document.getElementById("i10-total"),
        i10Period: () => document.getElementById("i10-period"),
        scholarMetrics: () => document.querySelectorAll('.scholar-metrics .metric-value, .scholar-metrics .metric-value-period'),
        chartContainer: () => document.getElementById('interactive-scholar-chart-container'),
        pubsGrid: () => document.getElementById("publicacoes-grid"),
        pubSearchInput: () => document.getElementById('publication-search'),
        pubClearBtn: () => document.getElementById('publication-clear-btn'),
        pubsShownCount: () => document.getElementById('pubs-shown-count'),
        pubsToggleBtn: () => document.getElementById('pubs-toggle-more'),
    };

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
    
    async function updateScholarMetrics() {
        console.log("Forçando o uso de dados de fallback para métricas.");
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
        } else {
             console.error("Dados de fallback para métricas não encontrados.");
        }
    }
    
    function renderPublications() {
        const grid = UI.pubsGrid();
        if (!grid) return;
        const lang = window.currentLang || 'pt';
        const searchFilter = (UI.pubSearchInput()?.value || '').trim().toLowerCase();
        
        let baseList = activeYearFilter ? allArticles.filter(art => art.year === activeYearFilter.toString()) : allArticles;
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

    function _animateChart(graphData, articles) {
        const containerId = 'interactive-scholar-chart-container';
        const yearlyData = {};
        
        (graphData || []).forEach(item => { yearlyData[item.year] = { citations: item.citations || 0, pubs: 0 }; });
        (articles || []).forEach(article => {
            const year = parseInt(article.year);
            if (year) {
                if (yearlyData[year]) { yearlyData[year].pubs++; } else { yearlyData[year] = { citations: 0, pubs: 1 }; }
            }
        });
        
        const sortedYears = Object.keys(yearlyData).filter(year => yearlyData[year].pubs > 0 || yearlyData[year].citations > 0).sort((a, b) => a - b);
        if (sortedYears.length === 0) return;

        const fullYears = sortedYears, fullCitCounts = sortedYears.map(y => yearlyData[y].citations || 0), fullPubCounts = sortedYears.map(y => yearlyData[y].pubs || 0);
        const maxPubs = Math.max(...fullPubCounts, 1), fullScaledPubCounts = fullPubCounts.map(p => Math.max(10, (p / maxPubs) * 40));
        const fullCustomData = sortedYears.map(y => ({ pubs: yearlyData[y].pubs || 0 }));
        
        const isMobile = window.innerWidth < 768, maxCitation = Math.max(...fullCitCounts, 0);
        const chartTitle = isMobile ? translations[currentLang]['chart-title-mobile'] : translations[currentLang]['chart-title'];
        const yAxisMin = maxCitation > 5 ? -maxCitation * 0.1 : -1;

        const layout = {
            title: { text: chartTitle, x: 0.5, xanchor: 'center', y: 0.95, yanchor: 'top', font: { size: isMobile ? 16 : 18, color: 'var(--text)' } },
            paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { color: 'var(--text-muted)', family: 'inherit' }, dragmode: false,
            xaxis: { title: { text: translations[currentLang]['chart-xaxis-title'], font: { size: isMobile ? 10 : 12 }}, gridcolor: 'var(--border)', zeroline: false, showline: true, linecolor: 'var(--border)', tickvals: fullYears, ticktext: fullYears, fixedrange: true, tickangle: isMobile ? -60 : -45, automargin: true },
            yaxis: { title: { text: translations[currentLang]['chart-yaxis-title'], font: { size: isMobile ? 10 : 12 }}, gridcolor: 'var(--border)', zeroline: false, showline: true, linecolor: 'var(--border)', range: [yAxisMin, maxCitation === 0 ? 10 : maxCitation * 1.1], fixedrange: true, automargin: true },
            margin: { l: isMobile ? 50 : 80, r: isMobile ? 20 : 40, b: isMobile ? 100 : 80, t: 80 }, hovermode: 'closest', showlegend: false, autosize: true
        };
        const config = { responsive: true, displaylogo: false, scrollZoom: false, modeBarButtonsToRemove: ['toImage', 'zoom2d', 'pan2d', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d', 'toggleSpikelines'] };
        const bubbleTrace = { x: fullYears, y: [], customdata: [], hovertemplate: '<b>Ano: %{x}</b><br>Citações: <b>%{y}</b><br>Publicações: <b>%{customdata.pubs}</b><extra></extra>', mode: 'markers', marker: { size: [], color: [], colorscale: [['0.0', 'rgba(16, 185, 129, 0.3)'], ['1.0', 'rgba(16, 185, 129, 1.0)']], showscale: true, colorbar: { title: translations[currentLang]['chart-colorbar-title'], thickness: 10, len: isMobile ? 0.75 : 0.9, x: isMobile ? 0.5 : 1.02, xanchor: isMobile ? 'center' : 'left', y: isMobile ? -0.5 : 0.5, yanchor: isMobile ? 'bottom' : 'middle', orientation: isMobile ? 'h' : 'v' } } };
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
        
        console.log("Forçando o uso de dados de fallback para publicações.");
        if (window.fallbackData?.scholarData?.articles) {
            allArticles = window.fallbackData.scholarData.articles;
        } else {
            grid.innerHTML = `<div class="card" style="color: var(--error); grid-column: 1 / -1;">${translations[currentLang].fetch_pub_error}: Dados de fallback não encontrados.</div>`;
            return;
        }
        renderPublications();
    }
    
    function attachEventListeners() {
        const searchInput = UI.pubSearchInput();
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                showingPubsCount = initialPubsToShow;
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
        if (!document.getElementById('publicacoes-grid')) return; 

        isIndexPage = !!UI.chartContainer();
        if (!isIndexPage) showingPubsCount = Infinity;
        
        attachEventListeners();
        
        if (isIndexPage) {
            await Promise.all([ updateScholarMetrics(), initializePublications() ]);
            renderInteractiveChart(citationGraphData, allArticles);
        } else {
            await initializePublications();
        }
    }
    
    return { 
        init, 
        allArticles: () => allArticles 
    };
})();