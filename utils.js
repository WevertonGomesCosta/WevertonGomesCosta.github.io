/**
 * @file utils.js
 * @description Contém scripts utilitários, incluindo fundo de partículas, validação de formulário, 
 * busca de repositórios do GitHub, busca de publicações do Google Scholar e geração de CV em PDF.
 * Scripts de busca (GitHub/Scholar) foram modificados para usar apenas dados de fallback.
 * @author Weverton C.
 * @version 9.0.0
 */

// =================================================================================
// Módulo: Configurações Gerais da Página
// =================================================================================
const PageSetup = {
    init() {
        this.updateDates();
    },
    updateDates() {
        const copyrightYearEl = document.getElementById('copyright-year');
        if (copyrightYearEl) {
            copyrightYearEl.textContent = new Date().getFullYear();
        }
        const lastUpdatedEl = document.getElementById('last-updated-date');
        if (lastUpdatedEl) {
            const lastModifiedDate = document.lastModified ? new Date(document.lastModified) : new Date();
            lastUpdatedEl.textContent = lastModifiedDate.toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }
    }
};

// =================================================================================
// Módulo: Fundo com Partículas
// =================================================================================
const ParticleBackground = {
    canvas: null,
    ctx: null,
    particles: [],
    config: {
        PARTICLE_DENSITY: 15000,
        MAX_PARTICLES: 120,
        CONNECTION_DISTANCE: 120,
        PARTICLE_COLOR: 'rgba(148, 163, 184, 0.1)',
        LINE_COLOR_BASE: '148, 163, 184',
    },
    init() {
        this.canvas = document.getElementById('particle-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.setCanvasSize();
        this.createParticles();
        this.animate();
        window.addEventListener('resize', () => {
            this.setCanvasSize();
            this.createParticles();
        });
    },
    setCanvasSize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },
    createParticles() {
        this.particles = [];
        const density = (this.canvas.width * this.canvas.height) / this.config.PARTICLE_DENSITY;
        const particleCount = Math.min(density, this.config.MAX_PARTICLES);
        for (let i = 0; i < particleCount; i++) {
            this.particles.push(new Particle(this.canvas));
        }
    },
    connectParticles() {
        const distSq = this.config.CONNECTION_DISTANCE * this.config.CONNECTION_DISTANCE;
        for (let a = 0; a < this.particles.length; a++) {
            for (let b = a + 1; b < this.particles.length; b++) {
                const dx = this.particles[a].x - this.particles[b].x;
                const dy = this.particles[a].y - this.particles[b].y;
                const distanceSquared = dx * dx + dy * dy;
                if (distanceSquared < distSq) {
                    const opacity = (1 - (distanceSquared / distSq)) * 0.2;
                    this.ctx.strokeStyle = `rgba(${this.config.LINE_COLOR_BASE}, ${opacity})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[a].x, this.particles[a].y);
                    this.ctx.lineTo(this.particles[b].x, this.particles[b].y);
                    this.ctx.stroke();
                }
            }
        }
    },
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.particles.forEach(p => p.update());
        this.connectParticles();
        requestAnimationFrame(() => this.animate());
    }
};

class Particle {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.dX = Math.random() * 0.4 - 0.2;
        this.dY = Math.random() * 0.4 - 0.2;
        this.size = Math.random() * 2 + 1;
    }
    draw() {
        const ctx = this.canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = ParticleBackground.config.PARTICLE_COLOR;
        ctx.fill();
    }
    update() {
        if (this.x > this.canvas.width || this.x < 0) this.dX = -this.dX;
        if (this.y > this.canvas.height || this.y < 0) this.dY = -this.dY;
        this.x += this.dX;
        this.y += this.dY;
        this.draw();
    }
}

// =================================================================================
// Módulo: Formulário de Contato
// =================================================================================
const ContactForm = {
    form: null,
    statusElement: null,
    fields: ['name', 'email', 'subject', 'message'],
    init() {
        this.form = document.getElementById("contact-form");
        if (!this.form) return;
        this.statusElement = document.getElementById("form-status");
        this.form.addEventListener("submit", this.handleSubmit.bind(this));
    },
    showError(input, message) {
        const formGroup = input.parentElement;
        const errorElement = formGroup.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        input.classList.add('error');
    },
    clearError(input) {
        const formGroup = input.parentElement;
        const errorElement = formGroup.querySelector('.error-message');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        input.classList.remove('error');
    },
    validate() {
        let isValid = true;
        if (typeof translations === 'undefined' || typeof currentLang === 'undefined') {
            console.error("Variáveis de tradução (translations, currentLang) não encontradas.");
            return false;
        }
        this.fields.forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;
            const isEmailInvalid = (id === 'email' && !/^\S+@\S+\.\S+$/.test(input.value));
            const isEmpty = input.value.trim() === '';
            if (isEmpty || isEmailInvalid) {
                const errorKey = `form-${id}-error`;
                this.showError(input, translations[currentLang][errorKey] || 'Campo inválido.');
                isValid = false;
            } else {
                this.clearError(input);
            }
        });
        return isValid;
    },
    async handleSubmit(event) {
        event.preventDefault();
        if (!this.statusElement) return;
        if (!this.validate()) {
            this.statusElement.textContent = '';
            return;
        }
        this.updateStatus(translations[currentLang].formSending, 'var(--accent)');
        const data = new FormData(event.target);
        try {
            const response = await fetch(event.target.action, {
                method: this.form.method,
                body: data,
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                this.handleSuccess();
            } else {
                const responseData = await response.json();
                this.handleError(responseData);
            }
        } catch (error) {
            console.error("Erro ao enviar formulário:", error);
            this.updateStatus(translations[currentLang].formError, 'var(--error)');
        }
    },
    handleSuccess() {
        this.updateStatus(translations[currentLang].formSuccess, 'var(--primary)');
        this.form.reset();
        this.fields.forEach(id => {
            const input = document.getElementById(id);
            if(input) this.clearError(input);
        });
    },
    handleError(responseData) {
        const errorMessage = responseData.errors?.map(e => e.message).join(", ") || translations[currentLang].formError;
        this.updateStatus(errorMessage, 'var(--error)');
    },
    updateStatus(message, color) {
        if (this.statusElement) {
            this.statusElement.textContent = message;
            this.statusElement.style.color = color;
        }
    }
};

// =================================================================================
// Módulo: Repositórios do GitHub (MODO FALLBACK)
// =================================================================================
const GithubReposModule = {
    state: { allRepos: [], filteredRepos: [], showingCount: 0, currentFilter: '', lang: 'pt', translations: {} },
    config: {},
    titleCase: (str) => !str ? '' : str.replace(/[-_]/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()),
    debounce: (fn, wait = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), wait); }; },
    
    createCard(repo) {
        const card = document.createElement('div');
        card.className = 'project-card card';
        card.setAttribute('role', 'listitem');
        const { lang, translations } = this.state;
        const trans = translations[lang] || {};
        const siteUrl = repo.homepage || (repo.has_pages ? `https://wevertongomescosta.github.io/${repo.name}/` : null);

        let actionsHtml = '';
        if (siteUrl) actionsHtml += `<a class="link-btn" href="${siteUrl}" target="_blank" rel="noopener">${trans['repo-live-site'] || 'Ver Site'}</a>`;
        actionsHtml += `<a class="link-btn ${siteUrl ? 'secondary' : ''}" href="${repo.html_url}" target="_blank" rel="noopener">${trans['repo-view-repo'] || 'Repositório'}</a>`;
        
        let metaBottomHtml = `<span class="badge">${repo.language || '—'}</span>`;
        if (this.config.isPaginated) {
            metaBottomHtml += `<span class="small-muted">${trans.updated_at || 'Atualizado em'} ${new Date(repo.updated_at).toLocaleDateString()}</span>`;
        }

        card.innerHTML = `
            <div class="project-top">
                <h3>${this.titleCase(repo.name)}</h3>
                <div class="project-meta">
                    <span class="badge" aria-label="${repo.stargazers_count} estrelas">⭐ ${repo.stargazers_count}</span>
                    <span class="badge" aria-label="${repo.forks_count} forks">🍴 ${repo.forks_count}</span>
                </div>
            </div>
            <p class="project-desc">${repo.description || (trans.no_description || 'Sem descrição.')}</p>
            <div class="project-topics">${(repo.topics || []).slice(0, 4).map(t => `<span class="topic-tag">${t}</span>`).join('')}</div>
            <div class="project-meta" style="margin-top: auto;">${metaBottomHtml}</div>
            <div class="actions">${actionsHtml}</div>`;
        return card;
    },
    updateMetaTextSafely(key, fallback, ...args) {
        if (!this.config.metaEl) return;
        const trans = this.state.translations[this.state.lang] || {};
        const msg = typeof trans[key] === 'function' ? trans[key](...args) : (trans[key] || fallback);
        this.config.metaEl.textContent = msg;
    },
    sortRepos: (arr) => [...arr].sort((a, b) => b.stargazers_count - a.stargazers_count || b.forks_count - a.forks_count || new Date(b.updated_at) - new Date(a.updated_at)),
    render() {
        if (!this.config.listEl) return;
        this.config.listEl.innerHTML = '';
        const trans = this.state.translations[this.state.lang] || {};
        const reposToDisplay = this.state.filteredRepos.slice(0, this.state.showingCount);

        if (reposToDisplay.length === 0) {
            this.config.listEl.innerHTML = `<div class="project-card"><p>${trans.no_repos_found || 'Nenhum repositório encontrado.'}</p></div>`;
        } else {
            reposToDisplay.forEach(repo => this.config.listEl.appendChild(this.createCard(repo)));
        }

        if (this.config.shownCountEl) this.config.shownCountEl.textContent = `${reposToDisplay.length} / ${this.state.filteredRepos.length}`;
        if (this.config.loadMoreBtnEl) {
            const hasMore = this.state.showingCount < this.state.filteredRepos.length;
            this.config.loadMoreBtnEl.classList.toggle('hidden', !hasMore || this.state.currentFilter.trim() !== '');
        }
    },
    filterAndRender() {
        const filter = this.state.currentFilter.trim().toLowerCase();
        let filtered = this.state.allRepos;
        if (filter) {
            filtered = this.state.allRepos.filter(r =>
                r.name.toLowerCase().includes(filter) || (r.description || '').toLowerCase().includes(filter) ||
                (r.language || '').toLowerCase().includes(filter) || r.topics.some(t => t.toLowerCase().includes(filter))
            );
        }
        this.state.filteredRepos = this.sortRepos(filtered);

        if (this.config.isPaginated && !filter) {
            this.state.showingCount = Math.min(this.config.initialCount, this.state.filteredRepos.length);
        } else {
            this.state.showingCount = this.state.filteredRepos.length;
        }

        if (!this.config.isPaginated) {
            this.updateMetaTextSafely('showing_repos', `Exibindo ${this.state.filteredRepos.length} de ${this.state.allRepos.length}`, this.state.filteredRepos.length, this.state.allRepos.length);
        }
        this.render();
    },
    reRenderWithCurrentLang() {
        this.state.lang = window.currentLang || 'pt';
        this.state.translations = window.translations || { pt: {} };
        this.filterAndRender();
    },
    init(userConfig) {
        const listEl = document.querySelector(userConfig.listSelector);
        if (!listEl) return;

        this.config = {
            listEl, metaEl: document.querySelector(userConfig.metaSelector),
            searchEl: document.querySelector(userConfig.searchSelector),
            clearBtnEl: document.querySelector(userConfig.clearBtnSelector),
            loadMoreBtnEl: document.querySelector(userConfig.loadMoreBtnSelector),
            shownCountEl: document.querySelector(userConfig.shownCountSelector),
            isPaginated: userConfig.isPaginated || false,
            initialCount: userConfig.initialCount || 3,
            incrementCount: userConfig.incrementCount || 3
        };

        this.state.lang = window.currentLang || 'pt';
        this.state.translations = window.translations || { pt: {} };

        // Carrega dados diretamente do fallback
        this.state.allRepos = window.fallbackData?.githubRepos || [];
        this.updateMetaTextSafely('loaded_repos_fallback', `Carregado ${this.state.allRepos.length} repositórios.`, this.state.allRepos.length);
        this.filterAndRender();

        if (this.config.searchEl) this.config.searchEl.addEventListener('input', this.debounce(e => { this.state.currentFilter = e.target.value; this.filterAndRender(); }));
        if (this.config.clearBtnEl) this.config.clearBtnEl.addEventListener('click', () => { if (this.config.searchEl) this.config.searchEl.value = ''; this.state.currentFilter = ''; this.filterAndRender(); if (this.config.searchEl) this.config.searchEl.focus(); });
        if (this.config.loadMoreBtnEl && this.config.isPaginated) this.config.loadMoreBtnEl.addEventListener('click', () => { this.state.showingCount = Math.min(this.state.showingCount + this.config.incrementCount, this.state.filteredRepos.length); this.render(); });
        
        window.githubScript_proj = { renderAll: this.reRenderWithCurrentLang.bind(this) };
    }
};

// =================================================================================
// MÓDULO: GOOGLE SCHOLAR E PUBLICAÇÕES (MODO FALLBACK)
// =================================================================================
const scholarScript = (function() {
    'use strict';
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
    
    function updateScholarMetrics() {
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

    function initializePublications() {
        const grid = UI.pubsGrid();
        if (!grid) return;
        grid.innerHTML = Array(isIndexPage ? 3 : 6).fill('<div class="skeleton-card"></div>').join('');
        
        if (window.fallbackData?.scholarData?.articles) {
            allArticles = window.fallbackData.scholarData.articles;
        } else {
            console.error("Dados de fallback para publicações não encontrados.");
            grid.innerHTML = `<div class="card" style="color: var(--error); grid-column: 1 / -1;">${translations[currentLang].fetch_pub_error}</div>`;
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

    function init() {
        if (!document.getElementById('publicacoes-grid')) return; 

        isIndexPage = !!UI.chartContainer();
        if (!isIndexPage) showingPubsCount = Infinity;
        
        attachEventListeners();
        
        initializePublications();
        if (isIndexPage) {
            updateScholarMetrics();
            renderInteractiveChart(citationGraphData, allArticles);
        }
    }
    
    return { 
        init, 
        allArticles: () => allArticles 
    };
})();

// =================================================================================
// MÓDULO: GERADOR DE CV EM PDF
// =================================================================================
const CvPdfGenerator = {
    init() {
        const downloadBtn = document.getElementById('download-cv-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.generateCvPdf();
            });
        }
    },

    stripHtml(html) {
        if (!html) return "";
        let doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    },

    async generateCvPdf() {
        const button = document.getElementById('download-cv-btn');
        const originalButtonHTML = button.innerHTML;
        const toast = document.getElementById('toast-notification');
        const themeColor = '#10b981';

        button.innerHTML = `<svg class="animate-spin" style="width: 20px; height: 20px; display: inline-block; margin-right: 8px;" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4.75V6.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M17.1266 6.87347L16.0659 7.93413" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M19.25 12L17.75 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M17.1266 17.1265L16.0659 16.0659" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 17.75V19.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M6.87344 17.1265L7.9341 16.0659" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M4.75 12L6.25 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M6.87344 6.87347L7.9341 7.93413" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg> <span>Gerando...</span>`;
        button.disabled = true;
        if (toast) {
            toast.textContent = 'Preparando seu currículo...';
            toast.classList.add('show');
        }

        try {
            const { jsPDF } = window.jspdf;
            const langContent = translations[currentLang] || {};
            const pdfStrings = langContent.pdf || {};

            const doc = new jsPDF('p', 'pt', 'a4');
            const page_width = doc.internal.pageSize.getWidth();
            const margin = 40;
            const max_width = page_width - margin * 2;
            let y = margin;
            const item_gap = 15;

            const checkPageBreak = (neededHeight) => {
                if (y + neededHeight > doc.internal.pageSize.getHeight() - margin) {
                    doc.addPage();
                    y = margin;
                }
            };

            let avatarDataUrl = null;
            try {
                const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(document.querySelector('.avatar').src)}`);
                const blob = await response.blob();
                avatarDataUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                console.error("Não foi possível carregar a imagem do avatar:", e);
            }

            if (avatarDataUrl) {
                doc.addImage(avatarDataUrl, 'JPEG', margin, y, 100, 100);
            }
            doc.setFontSize(22).setFont('helvetica', 'bold').setTextColor(0).text(document.getElementById('hero-name').textContent, margin + 115, y + 35);
            doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(100).text("Viçosa - Minas Gerais - Brasil", margin + 115, y + 55);
            doc.setFont('helvetica', 'bold').text("Email:", margin + 115, y + 70);
            doc.setFont('helvetica', 'normal').text("wevertonufv@gmail.com", margin + 155, y + 70);
            doc.setFont('helvetica', 'bold').text("LinkedIn:", margin + 115, y + 85);
            doc.setFont('helvetica', 'normal').setTextColor(40, 40, 255).textWithLink("linkedin.com/in/wevertoncosta", margin + 165, y + 85, { url: 'https://linkedin.com/in/wevertoncosta' });
            y += 120;

            const addSectionTitle = (title) => {
                y += (y > margin + 20) ? 25 : 5;
                checkPageBreak(40);
                doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor('#0f172a');
                doc.text(title.toUpperCase(), margin, y);
                y += 8;
                doc.setLineWidth(1);
                doc.setDrawColor(themeColor);
                doc.line(margin, y, page_width - margin, y);
                y += 20;
            };

            const addJustifiedText = (content, options = {}) => {
                const { fontSize = 10, x = margin, width = max_width, color = 80 } = options;
                if (!content || content.trim() === "") return;
                
                doc.setFontSize(fontSize).setFont('helvetica', 'normal').setTextColor(color);
                const cleanedContent = this.stripHtml(content).replace(/\s+/g, ' ').trim();
                const lines = doc.splitTextToSize(cleanedContent, width);
                const textHeight = lines.length * (fontSize * 1.2);
                checkPageBreak(textHeight);
                doc.text(lines, x, y, { align: 'justify', maxWidth: width });
                y += textHeight + 5;
            };
            
            addSectionTitle(pdfStrings['about-title'] || 'SOBRE MIM');
            addJustifiedText(langContent['about-p1']);
            addJustifiedText(langContent['about-p2']);
            addJustifiedText(langContent['about-p3']);

            addSectionTitle(pdfStrings['services-title'] || 'SERVIÇOS & CONSULTORIA');
            document.querySelectorAll('#servicos .card').forEach(card => {
                const title = card.querySelector('h3').innerText;
                const description = card.querySelector('p').innerText;
                checkPageBreak(50);
                doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(themeColor);
                doc.text(`• ${title}`, margin, y);
                y += 15;
                addJustifiedText(description, { x: margin + 10, width: max_width - 10 });
                y += item_gap / 2;
            });

            addSectionTitle(pdfStrings['skills-title'] || 'HABILIDADES TÉCNICAS');
            const skillsElements = document.querySelectorAll('#habilidades .skill-name, #skills .skill-name');
            if (skillsElements.length > 0) {
                const skills = Array.from(skillsElements).map(s => `• ${s.innerText.trim()}`);
                const half = Math.ceil(skills.length / 2);
                const column1 = skills.slice(0, half);
                const column2 = skills.slice(half);
                const initialY = y;
                const lineHeight = 14;
                checkPageBreak(column1.length * lineHeight);
                doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(80);
                doc.text(column1, margin, y);
                if (column2.length > 0) {
                    doc.text(column2, margin + (max_width / 2), initialY);
                }
                y += Math.max(column1.length, column2.length) * lineHeight + 10;
            }
            
            addSectionTitle(pdfStrings['expertise-title'] || 'ÁREAS DE ESPECIALIZAÇÃO');
            document.querySelectorAll('#experiencia .card').forEach(card => {
                 const title = `• ${card.querySelector('h3').innerText}:`;
                 const description = card.querySelector('p').innerText;
                 checkPageBreak(60);
                 doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(themeColor);
                 const titleLines = doc.splitTextToSize(title, max_width);
                 const initialY = y;
                 doc.text(titleLines, margin, y);
                 y += titleLines.length * 12;
                 let textX = margin + 10;
                 let textWidth = max_width - 10;
                 if (titleLines.length === 1) {
                     textX = margin + doc.getTextWidth(title) + 4;
                     textWidth = max_width - (doc.getTextWidth(title) + 4);
                     y = initialY;
                 }
                 addJustifiedText(description, { x: textX, width: textWidth });
                 y += item_gap;
            });
            
            addSectionTitle(pdfStrings['education-title'] || 'FORMAÇÃO ACADÊMICA');
            document.querySelectorAll('#formacao .timeline-item').forEach(item => {
                checkPageBreak(80);
                const title = item.querySelector('h3').innerText;
                const date = item.querySelector('.timeline-date').innerText;
                const institution = item.querySelector('p:not(.small-muted)').innerText;
                const advisor = item.querySelector('p.small-muted')?.innerHTML || '';
                const details = item.querySelector('.timeline-details').innerText;
                doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(40).text(title, margin, y);
                y += 14;
                doc.setFontSize(10).setFont('helvetica', 'italic').setTextColor(80).text(institution, margin, y);
                y += 14;
                doc.setFont('helvetica', 'normal').setTextColor(100).text(date, margin, y);
                y += 14;
                if(advisor){
                    const advisorLines = doc.splitTextToSize(this.stripHtml(advisor), max_width);
                    doc.setFont('helvetica', 'normal').text(advisorLines, margin, y);
                    y += advisorLines.length * 14;
                }
                addJustifiedText(details, { fontSize: 9 });
                y += item_gap;
            });

            addSectionTitle(pdfStrings['projects-title'] || 'PRINCIPAIS PROJETOS');
            (GithubReposModule.state.allRepos || []).slice(0, 3).forEach(repo => {
                checkPageBreak(60);
                const repoTitle = `• ${GithubReposModule.titleCase(repo.name)}`;
                const linkUrl = repo.homepage || repo.html_url;
                const linkText = repo.homepage ? '[Ver Site]' : '[Repositório]';

                doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(themeColor);
                doc.text(repoTitle, margin, y);

                if (linkUrl) {
                    const titleWidth = doc.getTextWidth(repoTitle);
                    doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(40, 40, 255);
                    doc.textWithLink(linkText, margin + titleWidth + 5, y, { url: linkUrl });
                }
                y += 15;

                addJustifiedText(repo.description, { x: margin + 10, width: max_width - 10 });
                y += item_gap / 2;
            });
            doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(40, 40, 255);
            const projectsPageUrl = `${window.location.origin}/projetos.html`;
            doc.textWithLink("Para mais projetos, acesse a página de projetos do site.", margin, y, { url: projectsPageUrl });
            y += 20;
            
            addSectionTitle(pdfStrings['publications-title'] || 'PRINCIPAIS PUBLICAÇÕES');
            (scholarScript.allArticles() || []).slice(0, 3).forEach(art => {
                checkPageBreak(80);
                doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(themeColor);
                const titleLines = doc.splitTextToSize(`• ${art.title}`, max_width);
                doc.text(titleLines, margin, y);
                y += titleLines.length * 12 + 5;
            
                doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(80);
                const metaText = `Publicado em: ${art.journalTitle || 'N/A'} - ${art.year || 'N/A'}`;
                const metaLines = doc.splitTextToSize(metaText, max_width - 10);
                doc.text(metaLines, margin + 10, y);
                y += metaLines.length * 12 + 5;
            
                if (art.cited_by?.value) {
                    doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(100);
                    const citationText = `Citado ${art.cited_by.value} vezes`;
                    doc.text(citationText, margin + 10, y);
                    y += 12;
                }

                if (art.doi && art.doiLink) {
                    doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(80);
                    const doiLabel = "DOI: ";
                    doc.text(doiLabel, margin + 10, y);
                    const doiLabelWidth = doc.getTextWidth(doiLabel);
                    doc.setTextColor(40, 40, 255);
                    doc.textWithLink(art.doi, margin + 10 + doiLabelWidth, y, { url: art.doiLink });
                    y += 12;
                }
                y += item_gap / 2; 
            });
            doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(40, 40, 255);
            const publicationsPageUrl = `${window.location.origin}/publicacoes.html`;
            doc.textWithLink("Para mais publicações, acesse a página de publicações do site.", margin, y, { url: publicationsPageUrl });
            y += 20;

            doc.save('CV-Weverton_Gomes_da_Costa.pdf');
            if (toast) {
                toast.textContent = 'Download iniciado!';
                toast.style.backgroundColor = '';
            }

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            if (toast) {
                toast.textContent = 'Ocorreu um erro ao gerar o PDF.';
                toast.style.backgroundColor = '#f44336';
            }
        } finally {
            button.innerHTML = originalButtonHTML;
            button.disabled = false;
            setTimeout(() => { if (toast) toast.classList.remove('show'); }, 3000);
        }
    }
};

// =================================================================================
// Inicializador Global
// =================================================================================
document.addEventListener("DOMContentLoaded", () => {
    PageSetup.init();
    ParticleBackground.init();
    ContactForm.init();
    CvPdfGenerator.init();
    scholarScript.init();

    if (document.getElementById('projects-list')) {
        if (document.getElementById('toggle-more')) {
            GithubReposModule.init({
                listSelector: '#projects-list', metaSelector: '#projects-meta', searchSelector: '#project-search',
                clearBtnSelector: '#clear-btn', loadMoreBtnSelector: '#toggle-more', shownCountSelector: '#shown-count',
                isPaginated: true, initialCount: 3, incrementCount: 3
            });
        } else {
            GithubReposModule.init({
                listSelector: '#projects-list', metaSelector: '#projects-meta', searchSelector: '#project-search',
                clearBtnSelector: '#clear-btn', isPaginated: false
            });
        }
    }
});