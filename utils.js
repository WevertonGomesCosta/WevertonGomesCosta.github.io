/**
 * @file utils.js
 * @description Contém scripts utilitários centralizados.
 * @version 15 (Adicionar dados de outras plataformas acadêmicas)  
 */
 
// =================================================================================
// MÓDULO CENTRALIZADO: Formatador de Datas
// =================================================================================
const DateFormatter = {
    format(dateInput) {
        if (!dateInput) return '';
        const date = new Date(dateInput);
        const lang = window.currentLang || 'pt';
        const locale = lang === 'pt' ? 'pt-BR' : 'en-US';

        return date.toLocaleDateString(locale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    },
    formatWithLabel(dateInput, translationKey) {
        const lang = window.currentLang || 'pt';
        const trans = (typeof translations !== 'undefined') ? translations[lang] : {};
        const label = trans[translationKey] || '';
        const formattedDate = this.format(dateInput);
        return `${label} ${formattedDate}`;
    }
};

// =================================================================================
// Módulo: Configurações Gerais da Página
// --- ALTERAÇÃO (Bug Fix 2: Data Privacidade) ---
// Garante que updateDates seja chamado de forma confiável após a carga inicial.
// Adicionado log para depuração.
// =================================================================================
const PageSetup = {
    init() {
        // A atualização inicial de datas AGORA É CHAMADA AQUI de forma segura,
        // pois init() só roda depois que os JSONs são carregados.
        this.updateDates();
        this.updateTimelineButtonsText(); // Atualiza botões da timeline também

        window.pageSetupScript = {
            renderAll: this.updateDates.bind(this),
            updateTimelineButtons: this.updateTimelineButtonsText.bind(this)
        };

        // Continua escutando mudanças de idioma para atualizações futuras
        if (window.AppEvents) {
            window.AppEvents.on('languageChanged', () => {
                this.updateDates();
                this.updateTimelineButtonsText();
            });
        }
    },
    updateTimelineButtonsText() {
        document.querySelectorAll('.toggle-details-btn').forEach(button => {
            const item = button.closest('.timeline-item');
            if (!item || typeof translations === 'undefined' || typeof window.currentLang === 'undefined') return;

            const isExpanded = item.classList.contains('expanded');
            const lang = window.currentLang;

            const key = isExpanded ? 'toggle-details-less' : 'toggle-details-more';
            button.textContent = translations[lang][key];
            button.dataset.key = key;
        });
    },
    updateDates() {
        if (typeof translations === 'undefined' || typeof window.currentLang === 'undefined') {
            console.warn("PageSetup.updateDates: translations ou currentLang não definidos ainda.");
            return;
        }
        console.log("PageSetup.updateDates: Função executada."); // Log geral

        const lastModifiedDate = document.lastModified ? new Date(document.lastModified) : new Date();

        const copyrightYearEl = document.getElementById('copyright-year');
        if (copyrightYearEl) {
            copyrightYearEl.textContent = new Date().getFullYear();
        }

        const footerLastUpdatedEl = document.getElementById('last-updated-date');
        if (footerLastUpdatedEl) {
            footerLastUpdatedEl.textContent = DateFormatter.formatWithLabel(lastModifiedDate, 'footer-update-text');
        }

        // Atualização específica para a página de privacidade
        const privacyUpdateEl = document.getElementById('privacy-update-date');
        if (privacyUpdateEl) {
            const formattedDate = DateFormatter.format(lastModifiedDate);
            // --- LOGGING PARA DEBUG ---
            console.log(`PageSetup.updateDates: Encontrado #privacy-update-date. Tentando definir data para: ${formattedDate} (Raw: ${lastModifiedDate})`);
            // --- FIM LOGGING ---
            privacyUpdateEl.textContent = formattedDate;
        } else if (document.body.id === 'page-privacy') {
             console.warn("PageSetup.updateDates: Na página de privacidade, mas #privacy-update-date não foi encontrado.");
        }
    }
};
// --- FIM ALTERAÇÃO ---

// =================================================================================
// Módulo: Manipulador da Navegação Móvel
// ... (código inalterado) ...
// =================================================================================
const MobileNavHandler = {
    init() {
        const navToggle = document.getElementById('nav-toggle');
        const navLinks = document.querySelectorAll('.nav-col-center a');

        if (!navToggle || !navLinks.length) {
            return;
        }

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (navToggle.checked) {
                    navToggle.checked = false;
                }
            });
        });
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
// Módulo: Repositórios do GitHub 
// --- ALTERAÇÃO (CORREÇÃO DO BUG) ---
// Função updateMetaText corrigida para usar string.replace()
// =================================================================================
const GithubReposModule = {
    state: { allRepos: [], filteredRepos: [], showingCount: 0, currentFilter: '' },
    config: {},
    titleCase: (str) => !str ? '' : str.replace(/[-_]/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()),
    debounce: (fn, wait = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), wait); }; },
    
    createCard(repo) {
        const card = document.createElement('div');
        card.className = 'project-card card';
        card.setAttribute('role', 'listitem');
        
        const trans = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') 
                      ? translations[currentLang] 
                      : {};
        
        const siteUrl = repo.homepage || (repo.has_pages ? `https://wevertongomescosta.github.io/${repo.name}/` : null);
    
        let actionsHtml = '';
        if (siteUrl) actionsHtml += `<a class="link-btn" href="${siteUrl}" target="_blank" rel="noopener" data-key="repo-live-site">${trans['repo-live-site'] || 'Ver Site'}</a>`;
        actionsHtml += `<a class="link-btn ${siteUrl ? 'secondary' : ''}" href="${repo.html_url}" target="_blank" rel="noopener" data-key="repo-view-repo">${trans['repo-view-repo'] || 'Repositório'}</a>`;

        let languageTag = repo.language ? `<span class="meta-badge language-badge" aria-label="Linguagem">${repo.language}</span>` : '';
    
        const formattedUpdateDate = DateFormatter.formatWithLabel(repo.updated_at, 'repo-last-update');
        
        let metaBottomHtml = `<span class="update-date">${formattedUpdateDate}</span>`;
    
        card.innerHTML = `
            <div class="project-top"><h3>${this.titleCase(repo.name)}</h3></div>
            <p class="project-desc">${repo.description || (trans.no_description || 'Sem descrição.')}</p>
            <div class="project-meta meta-icons">
                <div class="meta-icons">
                    <span class="meta-badge" aria-label="${repo.stargazers_count} estrelas">⭐ ${repo.stargazers_count}</span>
                    <span class="meta-badge" aria-label="${repo.forks_count} forks">🍴 ${repo.forks_count}</span>
                </div>
            </div>
            <div class="project-meta">${(repo.topics || []).slice(0, 4).map(t => `<span class="topic-tag">${t}</span>`).join('')}</div>
            <div class="project-meta" style="margin-top: auto;">${languageTag}</div>
            <div class="project-meta" style="margin-top: auto;">${metaBottomHtml}</div>
            <div class="actions">${actionsHtml}</div>`;
        return card;
    },

    // --- CORREÇÃO AQUI ---
    updateMetaText() {
        if (!this.config.metaEl) return;
        const trans = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') 
                      ? translations[currentLang] 
                      : {};
        // Usa a chave correta 'showing_repos_template' e replace()
        const template = trans.showing_repos_template || "Exibindo {shown} de {total} repositórios."; 
    },
    // --- FIM CORREÇÃO ---

    sortRepos: (arr) => [...arr].sort((a, b) => b.stargazers_count - a.stargazers_count || b.forks_count - a.forks_count || new Date(b.updated_at) - new Date(a.updated_at)),
    render() {
        if (!this.config.listEl) return;
        this.config.listEl.innerHTML = '';

        const trans = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') 
                      ? translations[currentLang] 
                      : {};
                      
        const reposToDisplay = this.state.filteredRepos.slice(0, this.state.showingCount);

        if (reposToDisplay.length === 0) {
            this.config.listEl.innerHTML = `<div class="project-card"><p data-key="no_repos_found">${trans.no_repos_found || 'Nenhum repositório encontrado.'}</p></div>`;
        } else {
            reposToDisplay.forEach(repo => this.config.listEl.appendChild(this.createCard(repo)));
        }
        
        if (this.config.clearBtnEl) {
             this.config.clearBtnEl.textContent = trans['clear-btn'] || 'Limpar';
             this.config.clearBtnEl.dataset.key = 'clear-btn'; // Garante que a chave está presente
        }
        if (this.config.loadMoreBtnEl) {
             this.config.loadMoreBtnEl.textContent = trans['show-more'] || 'Mostrar mais';
             this.config.loadMoreBtnEl.dataset.key = 'show-more'; // Garante que a chave está presente
        }

        if (this.config.shownCountEl) {
            const template = trans.showing_repos_template || "Exibindo {shown} de {total}"; 
            this.config.shownCountEl.textContent = template
                .replace("{shown}", reposToDisplay.length)
                .replace("{total}", this.state.filteredRepos.length);
        }

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
            // Se houver filtro ou não for paginado, mostra todos os resultados filtrados
            this.state.showingCount = this.state.filteredRepos.length; 
        }

        // --- CORREÇÃO AQUI ---
        // updateMetaText deve ser chamado APÓS calcular filteredRepos
        this.updateMetaText(); 
        // --- FIM CORREÇÃO ---

        this.render();
    },
    reRenderWithCurrentLang() {
        // Atualiza textos estáticos dos controles
        const trans = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') 
                      ? translations[currentLang] 
                      : {};
        if (this.config.clearBtnEl) this.config.clearBtnEl.textContent = trans['clear-btn'] || 'Limpar';
        if (this.config.loadMoreBtnEl) this.config.loadMoreBtnEl.textContent = trans['show-more'] || 'Mostrar mais';
        
        // Re-renderiza a lista com base nos filtros atuais
        this.filterAndRender(); 
    },
    init(userConfig) {
        const listEl = document.querySelector(userConfig.listSelector);
        if (!listEl) return;

        this.config = {
            listEl,
            metaEl: document.querySelector(userConfig.metaSelector),
            searchEl: document.querySelector(userConfig.searchSelector),
            clearBtnEl: document.querySelector(userConfig.clearBtnSelector),
            loadMoreBtnEl: document.querySelector(userConfig.loadMoreBtnSelector),
            shownCountEl: document.querySelector(userConfig.shownCountSelector),
            isPaginated: userConfig.isPaginated || false,
            initialCount: userConfig.initialCount || 3,
            incrementCount: userConfig.incrementCount || 3
        };

        this.state.allRepos = window.fallbackData?.githubRepos || [];
        // Chama filterAndRender AQUI para a renderização inicial
        this.filterAndRender(); 

        if (this.config.searchEl) this.config.searchEl.addEventListener('input', this.debounce(e => { this.state.currentFilter = e.target.value; this.filterAndRender(); }));
        if (this.config.clearBtnEl) this.config.clearBtnEl.addEventListener('click', () => { if (this.config.searchEl) this.config.searchEl.value = ''; this.state.currentFilter = ''; this.filterAndRender(); if (this.config.searchEl) this.config.searchEl.focus(); });
        if (this.config.loadMoreBtnEl && this.config.isPaginated) this.config.loadMoreBtnEl.addEventListener('click', () => { this.state.showingCount = Math.min(this.state.showingCount + this.config.incrementCount, this.state.filteredRepos.length); this.render(); }); // Render simples aqui é ok
        
        if (window.AppEvents) {
            window.AppEvents.on('languageChanged', this.reRenderWithCurrentLang.bind(this));
        }
    }
};

// =================================================================================
// MÓDULO: DASHBOARD ACADÊMICO (CORRIGIDO: SWIPE + ZOOM BLOQUEADO)
// =================================================================================
const scholarScript = (function() {
    'use strict';

    const initialPubsToShow = 3; 
    const pubsPerLoad = 3;        
    
    let dashboardData = {
        scholar: null, scopus: null, wos: null, max: null
    };

    let allArticles = []; 
    let showingPubsCount = 0;
    let activeYearFilter = null;
    let currentSlideIndex = 0;

    // --- UI References ---
    const UI = {
        track: null, slides: [],
        nextBtn: null, prevBtn: null, dots: [],
        pubsGrid: null,
        pubSearchInput: null, pubClearBtn: null,
        pubsShownCount: null, pubsLoadMoreBtn: null
    };

    // --- CARREGAMENTO ---
    async function ensureTranslationsLoaded() {
        if (window.translations && window.translations['pt']) return;
        try {
            const response = await fetch('translations.json');
            if (!response.ok) throw new Error('HTTP');
            window.translations = await response.json();
        } catch (e) { console.error("Erro Traduções:", e); window.translations = { pt: {}, en: {} }; }
    }

    // --- HELPERS ---
    const normalizeTitle = (str) => {
        if (!str) return '';
        return str.replace(/<[^>]+>/g, '').toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").replace(/\s\s+/g, ' ').trim();
    };

    const normalizeArticle = (rawArt) => {
        let cites = 0;
        if (rawArt.cited_by && typeof rawArt.cited_by === 'object') cites = rawArt.cited_by.value || 0;
        else cites = parseInt(rawArt.cited_by) || 0;
        
        let year = (rawArt.year || rawArt.ano || '0000').toString();
        year = year.replace(/\D/g, '').substring(0, 4);

        return {
            title: rawArt.title || 'Sem título',
            year: year,
            journalTitle: rawArt.journalTitle || rawArt.journal || '',
            link: rawArt.link || rawArt.doiLink || '#',
            doi: rawArt.doi || '',
            doiLink: rawArt.doiLink || (rawArt.doi ? `https://doi.org/${rawArt.doi}` : null),
            cited_by: { value: cites }
        };
    };

    // Animação de Números
    function animateCountUp(el, value) {
        if (!el) return;
        if (value === null || value === undefined) { el.textContent = "-"; return; }
        let target = parseInt(value, 10);
        if (isNaN(target)) { el.textContent = value; return; }

        const duration = 1000;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(ease * target).toLocaleString(window.currentLang === 'pt' ? 'pt-BR' : 'en-US');
            if (progress < 1) requestAnimationFrame(update);
            else el.textContent = target.toLocaleString(window.currentLang === 'pt' ? 'pt-BR' : 'en-US');
        }
        requestAnimationFrame(update);
    }

    // --- PROCESSAMENTO DE DADOS ---
    function processPlatformData(platformPrefix, dataKey) {
        const fb = window.fallbackData;
        if (!fb) return null;
        const acad = fb.academicData || fb;
        const data = acad[dataKey]; 

        let result = {
            metrics: { 
                cit: { all: 0, recent: null }, 
                h: { all: 0, recent: null }, 
                i10: { all: 0, recent: null },
                pubs: 0 
            },
            graphData: []
        };

        if (data) {
            const citedByNode = data.cited_by || data.profile?.cited_by;
            const totalPubsNode = data.total_publications || data.profile?.total_publications;

            if (citedByNode?.table) {
                const table = citedByNode.table;
                const getVals = (row) => {
                    if (!row) return { all: 0, recent: null };
                    const key = Object.keys(row)[0]; 
                    const obj = row[key];
                    const recentKey = Object.keys(obj).find(k => k.startsWith('since_') || k.startsWith('desde_'));
                    return { 
                        all: (obj.all !== undefined && obj.all !== null) ? obj.all : 0, 
                        recent: (recentKey && obj[recentKey] !== undefined) ? obj[recentKey] : null 
                    };
                };
                if(table[0]) result.metrics.cit = getVals(table[0]);
                if(table[1]) result.metrics.h = getVals(table[1]);
                if(table[2]) result.metrics.i10 = getVals(table[2]);
            } else if (Array.isArray(data.articles)) {
                result.metrics.cit.all = data.articles.length; 
            }

            if (totalPubsNode !== undefined && totalPubsNode !== null) {
                result.metrics.pubs = totalPubsNode;
            } else if (Array.isArray(data.articles)) {
                result.metrics.pubs = data.articles.length;
            }

            if (citedByNode?.graph) {
                result.graphData = citedByNode.graph;
            }
        }
        return result;
    }

    // --- RENDERIZAÇÃO ---
    function renderPlatform(platformPrefix) {
        const data = dashboardData[platformPrefix];
        if (!data) return;

        const citEl = document.getElementById(`${platformPrefix}-cit`);
        const hEl = document.getElementById(`${platformPrefix}-h`);
        const i10El = document.getElementById(`${platformPrefix}-i10`);
        const pubsEl = document.getElementById(`${platformPrefix}-pubs`);

        if (citEl) animateCountUp(citEl, data.metrics.cit.all);
        if (hEl) animateCountUp(hEl, data.metrics.h.all);
        if (i10El) animateCountUp(i10El, data.metrics.i10.all);
        if (pubsEl) animateCountUp(pubsEl, data.metrics.pubs);

        updatePeriodLabels(platformPrefix, data.metrics);

        const chartDiv = document.getElementById(`${platformPrefix}-chart`);
        if (chartDiv) {
            if (data.graphData && data.graphData.length > 0) {
                renderDualAxisChart(chartDiv, data.graphData, platformPrefix);
            } else {
                chartDiv.innerHTML = "<div style='text-align:center;padding:20px;color:#888;font-size:0.9rem'>Sem dados históricos</div>";
            }
        }
    }

    function updatePeriodLabels(platformPrefix, metrics) {
        const t = window.translations?.[window.currentLang] || {};
        let sinceTextRaw = t['metric-since'] || 'Since 2021';
        let sinceText = sinceTextRaw.replace(/\d{4}/, '2021');

        const ensureAndSetLabel = (idBase, valObj) => {
            const periodId = `${idBase}-period`;
            let elPeriod = document.getElementById(periodId);
            const elMain = document.getElementById(idBase);

            if (!elPeriod && elMain) {
                elPeriod = document.createElement('span');
                elPeriod.id = periodId;
                elMain.insertAdjacentElement('afterend', elPeriod);
            }

            if (elPeriod) {
                if (valObj.recent !== null && valObj.recent !== undefined && valObj.recent !== 0) {
                    elPeriod.innerHTML = ` / ${valObj.recent} <span style="font-size:0.7em; opacity:0.8; white-space:nowrap;">(${sinceText})</span>`;
                    elPeriod.style.display = 'inline';
                    elPeriod.style.marginLeft = '5px'; 
                    elPeriod.style.fontWeight = 'normal';
                } else {
                    elPeriod.style.display = 'none';
                }
            }
        };

        ensureAndSetLabel(`${platformPrefix}-cit`, metrics.cit);
        ensureAndSetLabel(`${platformPrefix}-h`, metrics.h);
        ensureAndSetLabel(`${platformPrefix}-i10`, metrics.i10);
    }

    // --- ATUALIZAÇÃO GLOBAL ---
    function updateAllTexts() {
        renderPlatform('scholar');
        renderPlatform('scopus');
        renderPlatform('wos');
        renderPlatform('max'); 
        renderPublications(); 
        
        setTimeout(() => {
            ['scholar', 'scopus', 'wos', 'max'].forEach(prefix => {
                const el = document.getElementById(`${prefix}-chart`);
                if (el && typeof Plotly !== 'undefined') {
                    try { Plotly.Plots.resize(el); } catch(e){}
                }
            });
        }, 300);
    }

    // --- GRÁFICO (ZOOM E TOOLBAR REMOVIDOS) ---
    function renderDualAxisChart(container, rawData, platform) {
        const t = window.translations?.[window.currentLang] || {};
        const activeYears = rawData.filter(d => (d.citations > 0 || d.publications > 0));
        
        if (activeYears.length === 0) {
            container.innerHTML = "<div style='text-align:center;padding:20px;color:#888;font-size:0.9rem'>Sem atividade registrada</div>";
            return;
        }

        const yearsNum = activeYears.map(d => parseInt(d.year)).filter(y => !isNaN(y));
        const minYear = Math.min(...yearsNum);
        const maxYear = Math.max(...yearsNum);

        const processedData = [];
        for (let y = minYear; y <= maxYear; y++) {
            const existing = rawData.find(d => parseInt(d.year) === y);
            processedData.push({
                year: y,
                citations: existing ? (existing.citations || 0) : 0,
                publications: existing ? (existing.publications || 0) : 0
            });
        }

        const xVal = processedData.map(d => d.year);
        const yCitations = processedData.map(d => d.citations);
        const yPubs = processedData.map(d => d.publications);

        let colorLine = '#10b981'; 
        if (platform === 'scholar') colorLine = '#4285F4'; 
        if (platform === 'scopus') colorLine = '#ff7f0e';  
        if (platform === 'wos') colorLine = '#8b5cf6';     

        const lblPubs = t['chart-pubs'] || (window.currentLang === 'pt' ? 'Publicações' : 'Publications');
        const lblCits = t['chart-cits'] || (window.currentLang === 'pt' ? 'Citações' : 'Citations');

        const tracePubs = {
            x: xVal, y: yPubs, name: lblPubs, type: 'bar', yaxis: 'y2',
            marker: { color: 'rgba(255, 255, 255, 0.15)', line: { color: 'rgba(255, 255, 255, 0.3)', width: 1 } },
            hovertemplate: `<b>%{x}</b><br>${lblPubs}: %{y}<extra></extra>`
        };

        const traceCits = {
            x: xVal, y: yCitations, name: lblCits, type: 'scatter', mode: 'lines+markers',
            line: { color: colorLine, width: 3, shape: 'spline' },
            marker: { size: 6, color: colorLine, line: { color: '#fff', width: 1 } },
            hovertemplate: `<b>%{x}</b><br>${lblCits}: %{y}<extra></extra>`
        };

        const layout = {
            paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#888', family: 'Inter, sans-serif' },
            legend: { orientation: 'h', x: 0, y: 1.1 },
            margin: { t: 30, l: 40, r: 40, b: 40 },
            height: 350, 
            autosize: true,
            
            // --- BLOQUEIO TOTAL DE ZOOM E PAN ---
            xaxis: { 
                gridcolor: '#333', 
                showgrid: false, 
                zeroline: false, 
                type: 'category',
                fixedrange: true // Impede zoom no eixo X
            },
            yaxis: { 
                title: { text: lblCits, font: { color: colorLine, size: 12 } }, 
                gridcolor: '#333', showgrid: true, zeroline: false, tickfont: { color: colorLine },
                fixedrange: true // Impede zoom no eixo Y
            },
            yaxis2: { 
                title: { text: lblPubs, font: { color: '#999', size: 12 } }, 
                overlaying: 'y', side: 'right', showgrid: false, zeroline: false, tickfont: { color: '#999' },
                fixedrange: true // Impede zoom no eixo Y2
            },
            dragmode: false, // Desativa o arrastar para zoom
            hovermode: 'x unified'
        };
        
        // --- REMOÇÃO DA BARRA DE FERRAMENTAS ---
        const config = { 
            responsive: true, 
            displayModeBar: false // Remove ícones de zoom/pan/download
        };

        Plotly.react(container, [tracePubs, traceCits], layout, config);
        
        setTimeout(() => { try { Plotly.Plots.resize(container); } catch(e) {} }, 50);

        container.on('plotly_click', data => {
            const year = data.points[0].x;
            activeYearFilter = (activeYearFilter == year) ? null : year;
            showingPubsCount = initialPubsToShow;
            renderPublications();
            updateFilterUI();
        });
    }

    // --- CARROSSEL (COM SWIPE) ---
    function updateCarouselPosition() {
        if (!UI.track || UI.slides.length === 0) return;
        const width = UI.slides[0].getBoundingClientRect().width;
        UI.track.style.transform = `translateX(-${width * currentSlideIndex}px)`;
        UI.slides.forEach((s, i) => s.classList.toggle('current-slide', i === currentSlideIndex));
        UI.dots.forEach((d, i) => d.classList.toggle('current-slide', i === currentSlideIndex));
    }

    function initCarouselLogic() {
        if (!UI.track) return;

        // Funções de navegação
        const moveNext = () => {
            currentSlideIndex = (currentSlideIndex + 1) % UI.slides.length;
            updateCarouselPosition();
        };

        const movePrev = () => {
            currentSlideIndex = (currentSlideIndex - 1 + UI.slides.length) % UI.slides.length;
            updateCarouselPosition();
        };

        // Eventos de clique
        if(UI.nextBtn) UI.nextBtn.addEventListener('click', moveNext);
        if(UI.prevBtn) UI.prevBtn.addEventListener('click', movePrev);
        UI.dots.forEach((dot, idx) => dot.addEventListener('click', () => { currentSlideIndex = idx; updateCarouselPosition(); }));

        // --- LÓGICA DE SWIPE (ARRASTAR O DEDO) ---
        let touchStartX = 0;
        let touchEndX = 0;

        UI.track.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, {passive: true});

        UI.track.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, {passive: true});

        function handleSwipe() {
            const threshold = 50; // Mínimo de pixels para considerar um swipe
            if (touchEndX < touchStartX - threshold) { 
                moveNext(); // Deslizou para esquerda -> Próximo
            }
            if (touchEndX > touchStartX + threshold) {
                movePrev(); // Deslizou para direita -> Anterior
            }
        }
        // ------------------------------------------

        window.addEventListener('resize', updateCarouselPosition);
    }

    // --- LISTA DE PUBLICAÇÕES ---
    function renderPublications() {
        const grid = UI.pubsGrid;
        if (!grid) return;
        
        const t = window.translations?.[window.currentLang] || {};
        const term = (UI.pubSearchInput?.value || '').toLowerCase();

        let list = activeYearFilter ? allArticles.filter(a => a.year == activeYearFilter) : allArticles;
        if (term) {
            list = list.filter(a => 
                normalizeTitle(a.title).includes(term) || 
                a.year.includes(term) || 
                normalizeTitle(a.journalTitle).includes(term)
            );
        }

        const visible = list.slice(0, showingPubsCount);
        grid.innerHTML = "";

        if (visible.length === 0) {
            grid.innerHTML = `<div class="card" style="grid-column:1/-1;text-align:center;padding:2rem;"><p>${t.no_pubs_found || 'Nada encontrado.'}</p></div>`;
        } else {
            visible.forEach(art => {
                const link = art.doiLink || art.link;
                const doi = art.doi ? `<div class="publication-doi"><a href="${link}" target="_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/1/11/DOI_logo.svg" style="height:14px;margin-right:5px">${art.doi}</a></div>` : '';
                const citText = art.cited_by.value ? `${t['pub-cited-by']||'Citado'} ${art.cited_by.value}x` : '-';
                
                const card = document.createElement('div');
                card.className = 'card publication-card';
                card.innerHTML = `<h3>${art.title}</h3>${doi}<div class="publication-meta">${art.year} • <em>${art.journalTitle}</em></div><div class="citations" style="color:var(--accent);font-weight:bold;margin-top:5px;">${citText}</div><a href="${link}" target="_blank" class="article-link" style="margin-top:auto;padding-top:10px;display:inline-block;">${t['pub-read']||'Ver'} &rarr;</a>`;
                grid.appendChild(card);
            });
        }

        if(UI.pubsShownCount) UI.pubsShownCount.textContent = `${visible.length} / ${list.length}`;
        if(UI.pubsLoadMoreBtn) {
            UI.pubsLoadMoreBtn.style.display = (visible.length >= list.length) ? 'none' : 'inline-block';
        }
    }

    function updateFilterUI() {
        const div = document.querySelector('#publicacoes .controls');
        let chip = document.getElementById('year-filter-chip');
        if (activeYearFilter) {
            if (!chip) {
                chip = document.createElement('div');
                chip.id = 'year-filter-chip';
                chip.style.cssText = "background:var(--primary);color:#fff;padding:5px 12px;border-radius:15px;margin-top:10px;cursor:pointer;display:inline-block;";
                div.appendChild(chip);
            }
            chip.innerHTML = `Filtro: ${activeYearFilter} &times;`;
            chip.onclick = () => { activeYearFilter = null; renderPublications(); updateFilterUI(); };
        } else if (chip) chip.remove();
    }

    // --- INIT ---
    async function init() {
        await ensureTranslationsLoaded();

        UI.track = document.querySelector('.carousel-track');
        UI.slides = Array.from(document.querySelectorAll('.carousel-slide'));
        UI.nextBtn = document.querySelector('.next-btn');
        UI.prevBtn = document.querySelector('.prev-btn');
        UI.dots = Array.from(document.querySelectorAll('.carousel-indicator'));
        
        UI.pubsGrid = document.getElementById("publicacoes-grid");
        UI.pubSearchInput = document.getElementById('publication-search');
        UI.pubClearBtn = document.getElementById('publication-clear-btn');
        UI.pubsShownCount = document.getElementById('pubs-shown-count');
        UI.pubsLoadMoreBtn = document.getElementById('pubs-toggle-more');

        // Popula Dados do Dashboard
        dashboardData.scholar = processPlatformData('scholar', 'google_scholar');
        dashboardData.scopus = processPlatformData('scopus', 'scopus');
        dashboardData.wos = processPlatformData('wos', 'web_of_science');
        dashboardData.max = processPlatformData('max', 'maximized');

        // Popula Lista Principal de Artigos
        const fb = window.fallbackData;
        if (fb) {
            const acad = fb.academicData || fb;
            let raw = acad.maximized?.articles || acad.google_scholar?.articles || [];
            allArticles = raw.map(normalizeArticle);
            allArticles.sort((a, b) => b.cited_by.value - a.cited_by.value);
        }

        const isPubsPage = window.location.pathname.includes('publicacoes');
        
        if (isPubsPage) {
            showingPubsCount = allArticles.length;
        } else {
            showingPubsCount = initialPubsToShow;
        }

        updateAllTexts();
        initCarouselLogic();
        
        if(UI.pubSearchInput) UI.pubSearchInput.addEventListener('input', () => { 
            showingPubsCount = isPubsPage ? allArticles.length : initialPubsToShow; 
            renderPublications(); 
        });
        
        if(UI.pubClearBtn) UI.pubClearBtn.addEventListener('click', () => { 
            UI.pubSearchInput.value = ''; 
            showingPubsCount = isPubsPage ? allArticles.length : initialPubsToShow; 
            renderPublications(); 
        });
        
        if(UI.pubsLoadMoreBtn) UI.pubsLoadMoreBtn.addEventListener('click', () => { 
            showingPubsCount += pubsPerLoad; 
            renderPublications(); 
        });

        if (window.AppEvents) window.AppEvents.on('languageChanged', updateAllTexts);
    }

    return { init };
})();

// =================================================================================
// MÓDULO: GERADOR DE CV EM PDF (VERSÃO ATUALIZADA PARA 2 TIPOS DE CV - DINÂMICO)
// =================================================================================
const CvPdfGenerator = {
    init() {
        const downloadButtons = document.querySelectorAll('[data-cv-type]');
        if (downloadButtons.length === 0) {
            console.warn("CvPdfGenerator: Nenhum botão/link de download de CV encontrado (sem [data-cv-type]).");
            return;
        }
        downloadButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const cvType = button.dataset.cvType; 
                if (button.hasAttribute('data-generating')) return;
                this.generateCvPdf(cvType, button); 
            });
        });
    },

    stripHtml(html) { 
        if (!html) return "";
        let doc = new DOMParser().parseFromString(html, 'text/html');
        doc.body.querySelectorAll('p, br, h1, h2, h3, h4, h5, h6, li, blockquote, dd, dt').forEach(el => {
           el.insertAdjacentText('afterend', ' ');
        });
        return doc.body.textContent || "";
    },

// ==========================================================
    // === SUBSTITUA A FUNÇÃO ANTERIOR POR ESTA VERSÃO ATUALIZADA ===
    // ==========================================================
    async cropImageToCircle(imageDataUrl) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Usar a menor dimensão (largura ou altura) para o círculo
                const size = Math.min(img.width, img.height);
                canvas.width = size;
                canvas.height = size;

                // --- BLOCO 1: DEFINIR A MÁSCARA CIRCULAR ---
                ctx.beginPath();
                // arc(centroX, centroY, raio, anguloInicio, anguloFim)
                ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2, true);
                ctx.closePath();
                
                // Ativa o "clipping path" (máscara)
                ctx.clip();

                // --- BLOCO 2: DESENHAR A IMAGEM ---
                // Isso centraliza a imagem e a recorta
                const sx = (img.width > size) ? (img.width - size) / 2 : 0;
                const sy = (img.height > size) ? (img.height - size) / 2 : 0;
                
                //drawImage(imagem, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
                // Desenha a parte central da imagem original dentro do canvas
                ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);


                // --- INÍCIO DA ALTERAÇÃO: ADICIONAR CONTORNO ---
                
                // --- BLOCO 3: DESENHAR O CONTORNO (BORDA) ---
                
                // Define a cor da borda (a mesma 'themeColor' do seu PDF)
                const themeColor = '#10b981';
                // Define a largura da borda. 
                // Usamos um valor relativo (ex: 1.5% do tamanho) para escalar bem.
                const borderWidth = size * 0.015; // 1.5%
                
                ctx.lineWidth = borderWidth;
                ctx.strokeStyle = themeColor;

                // Cria um novo caminho para a borda
                ctx.beginPath();
                // O raio deve ser (Raio total) - (metade da largura da borda)
                // para que a borda seja desenhada "para dentro" da borda.
                const radius = (size / 2) - (borderWidth / 2);
                ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2, true);
                ctx.closePath();
                
                // Desenha a linha (contorno)
                ctx.stroke();

                // --- FIM DA ALTERAÇÃO ---

                // Exporta o canvas como um novo Data URL (PNG, para transparência)
                resolve(canvas.toDataURL('image/png'));
            };

            img.onerror = (error) => {
                reject(new Error("Erro ao carregar imagem no canvas para recortar."));
            };

            // Habilita o CORS para a imagem, se aplicável
            img.crossOrigin = "anonymous"; 
            img.src = imageDataUrl;
        });
    },
    // ==========================================================
    // === FIM DA FUNÇÃO ATUALIZADA ===
    // ==========================================================
    
    async generateCvPdf(cvType, clickedButton) {
        const lang = typeof currentLang !== 'undefined' ? currentLang : 'pt';
        const langContent = translations[lang] || translations['pt'];
        const pdfStrings = langContent.pdf || {};
        const toast = document.getElementById('toast-notification');
        const originalButtonHTML = clickedButton.innerHTML; 

        clickedButton.setAttribute('data-generating', 'true');
        const loadingSpinnerSVG = `<svg class="animate-spin" style="width: 20px; height: 20px; display: inline-block; margin-right: 8px;" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4.75V6.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M17.1266 6.87347L16.0659 7.93413" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M19.25 12L17.75 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M17.1266 17.1265L16.0659 16.0659" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 17.75V19.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M6.87344 17.1265L7.9341 16.0659" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M4.75 12L6.25 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M6.87344 6.87347L7.9341 7.93413" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
        clickedButton.innerHTML = `${loadingSpinnerSVG} <span>${langContent['cv-generating'] || 'Gerando...'}</span>`;
        clickedButton.style.pointerEvents = 'none';

        if (toast) {
            toast.textContent = langContent['cv-generating'] || 'Preparando seu currículo...';
            toast.classList.add('show');
            toast.style.backgroundColor = '';
        }

        try {
            if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
                 throw new Error('Biblioteca jsPDF não carregada.');
            }
            const { jsPDF } = window.jspdf;
            const themeColor = '#10b981';

            const doc = new jsPDF('p', 'pt', 'a4');
            const page_width = doc.internal.pageSize.getWidth();
            const margin = 40;
            const max_width = page_width - margin * 2;
            let y = margin;
            const item_gap = 12; 
            const section_gap = 20; 

            const checkPageBreak = (neededHeight) => { 
                if (y + neededHeight > doc.internal.pageSize.getHeight() - margin) {
                    doc.addPage();
                    y = margin;
                 }
            };

             let avatarDataUrl = null;
             try {
                const avatarImg = document.querySelector('.avatar') || document.querySelector('.nav-avatar'); 
                if (avatarImg && avatarImg.src) {
                    
                    let rawDataUrl; // Variável temporária para a imagem crua
                    
                    if (avatarImg.src.startsWith('data:image')) {
                        rawDataUrl = avatarImg.src;
                    } else {
                         const imageUrl = avatarImg.src.startsWith('http') ? `https://corsproxy.io/?${encodeURIComponent(avatarImg.src)}` : avatarImg.src;
                         const response = await fetch(imageUrl);
                         if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                         const blob = await response.blob();
                         rawDataUrl = await new Promise((resolve, reject) => {
                             const reader = new FileReader();
                             reader.onloadend = () => resolve(reader.result);
                             reader.onerror = (error) => reject(error); 
                             reader.readAsDataURL(blob);
                         });
                     }
                     
                     // --- ALTERAÇÃO PRINCIPAL ---
                     // Se conseguimos a imagem crua, agora a processamos para virar circular
                     if (rawDataUrl) {
                        avatarDataUrl = await this.cropImageToCircle(rawDataUrl);
                     }
                     // --- FIM DA ALTERAÇÃO ---

                 }
             } catch (e) {
                // A mensagem de erro agora cobre o carregamento OU processamento
                console.error("Não foi possível carregar ou processar a imagem do avatar:", e);
             }

            // --- CABEÇALHO DO PDF (Comum a ambos os CVs) ---
            
            // --- ALTERAÇÃO: Aumentar tamanho da imagem ---
            const avatarSize = 100; // Mantendo 100 (conforme feedback do usuário)
            
            if (avatarDataUrl) {
                // --- ALTERAÇÃO: MUDAR DE 'JPEG' PARA 'PNG' ---
                // A imagem agora é um PNG circular com transparência.
                // O 'clip' e 'save/restore' não são mais necessários.
                doc.addImage(avatarDataUrl, 'PNG', margin, y, avatarSize, avatarSize); 
            }
            
            // Ajusta o X inicial do texto e a Largura máxima do texto para a nova imagem
            const xPadding = 15; // Espaço entre imagem e texto
            const headerX = avatarDataUrl ? margin + avatarSize + xPadding : margin; 
            const headerW = avatarDataUrl ? max_width - (avatarSize + xPadding) : max_width; 
            // --- FIM DA ALTERAÇÃO ---

            // Pega o idioma atual (necessário para a correção do Location)
            const lang = window.currentLang || 'pt';

            doc.setFontSize(20).setFont('helvetica', 'bold').setTextColor(0).text(langContent['hero-name'] || 'Weverton Gomes da Costa', headerX, y + 15, { maxWidth: headerW });
            
            // --- ALTERAÇÃO: Adicionando todos os subtítulos ---
            
            // Subtítulo 1
            doc.setFontSize(12).setFont('helvetica', 'normal').setTextColor(themeColor).text(langContent['subtitle-1'] || 'Cientista de Dados | Doutorando em Estatística', headerX, y + 30, { maxWidth: headerW });
            
            // Subtítulo 2
            doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(80).text(langContent['subtitle-2'] || '', headerX, y + 44, { maxWidth: headerW });
            
            // Subtítulo 3
            doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(80).text(langContent['subtitle-3'] || '', headerX, y + 57, { maxWidth: headerW });
            
            // --- Fim da Alteração ---

            // Posições 'y' ajustadas para os itens seguintes:
            doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(80);
            doc.text(`Email: wevertonufv@gmail.com`, headerX, y + 70); 
            
            doc.text(`LinkedIn: linkedin.com/in/wevertoncosta`, headerX, y + 82); 
            doc.setTextColor(40, 40, 255); 
            try {
                doc.textWithLink('linkedin.com/in/wevertoncosta', headerX + doc.getTextWidth('LinkedIn: '), y + 82, { url: 'https://linkedin.com/in/wevertoncosta' }); 
            } catch (e) { console.warn("jsPDF textWithLink pode não ser suportado."); }
            doc.setTextColor(80); 

            // Correção do "Location" (como feito anteriormente)
            const locationLabel = (lang === 'pt') ? 'Localização:' : 'Location:';
            doc.text(`${locationLabel} ${langContent['pdf-location'] || 'Viçosa - MG, Brazil'}`, headerX, y + 94); 

            // --- ALTERAÇÃO: Ajusta o 'y' final para acomodar a imagem maior (avatarSize) e os subtítulos (25 pts) ---
            const finalYIncrement = avatarDataUrl ? avatarSize + 25 : 80 + 25; // Usa o avatarSize (100)
            y += finalYIncrement + item_gap; 
            // --- FIM DA ALTERAÇÃO --- 

            // --- Funções Auxiliares (Mantidas) ---
             const addSectionTitle = (title) => {
                 y += section_gap; 
                 checkPageBreak(30); 
                 doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor('#0f172a');
                 doc.text(title.toUpperCase(), margin, y);
                 y += 6;
                 doc.setLineWidth(0.5); 
                 doc.setDrawColor(themeColor);
                 doc.line(margin, y, page_width - margin, y);
                 y += 15; 
             };

            const addJustifiedText = (content, options = {}) => { 
                 const { fontSize = 9, x = margin, width = max_width, color = 80, lineHeightFactor = 1.15 } = options; 
                 if (!content || content.trim() === "") return;

                 doc.setFontSize(fontSize).setFont('helvetica', 'normal').setTextColor(color);
                 const cleanedContent = this.stripHtml(content).replace(/\s+/g, ' ').trim();
                  if (typeof doc.splitTextToSize !== 'function') {
                     console.error("doc.splitTextToSize not available.");
                     doc.text(cleanedContent, x, y, { maxWidth: width });
                     y += (fontSize * lineHeightFactor) * Math.ceil(cleanedContent.length / (width / (fontSize * 0.5))) + 5; 
                     return;
                 }
                 const lines = doc.splitTextToSize(cleanedContent, width);
                 const textHeight = lines.length * (fontSize * lineHeightFactor);
                 checkPageBreak(textHeight);
                 doc.text(lines, x, y, { align: 'justify', maxWidth: width, lineHeightFactor: lineHeightFactor });
                 y += textHeight + 5; 
             };

            // --- SEÇÕES DO PDF (Lendo do JSON) ---

            // --- SOBRE MIM ---
            addSectionTitle(pdfStrings['about-title'] || 'SOBRE MIM');
            if (cvType === 'pro') {
                addJustifiedText(langContent['about-p1']); 
            } else { 
                addJustifiedText(langContent['about-p1']);
                addJustifiedText(langContent['about-p2']);
                addJustifiedText(langContent['about-p3']);
            }

            // --- SERVIÇOS / FRENTES DE ATUAÇÃO ---
            // --- ALTERAÇÃO (Sugestão 1: Refatoração do PDF) ---
             addSectionTitle(pdfStrings['services-title'] || (langContent['services-title'] || 'COMO POSSO AJUDAR'));
             const services = [
                { titleKey: 'service-title1', descKey: 'service-desc1' },
                { titleKey: 'service-title2', descKey: 'service-desc2' },
                { titleKey: 'service-title3', descKey: 'service-desc3' }
             ];
             services.forEach(service => {
                 const title = langContent[service.titleKey] || 'Service Title';
                 const description = langContent[service.descKey] || 'Service Description';
                 checkPageBreak(40); 
                 doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(themeColor);
                 doc.text(`• ${title}`, margin, y);
                 y += 12;
                 addJustifiedText(description, { x: margin + 8, width: max_width - 8, fontSize: 9 }); 
                 y += item_gap / 2;
             });
             // --- FIM ALTERAÇÃO ---

             // --- HABILIDADES TÉCNICAS ---
             // --- ALTERAÇÃO (Sugestão 1: Refatoração do PDF) ---
             addSectionTitle(pdfStrings['skills-title'] || (langContent['skills-title'] || 'HABILIDADES TÉCNICAS'));
             const skillKeys = [
                'skill-name-r', 'skill-name-genes', 'skill-name-selegen', 'skill-name-python',
                'skill-name-eda', 'skill-name-ml', 'skill-name-deep-learning',
                'skill-name-genomic-sel', 'skill-name-mixed-models', 'skill-name-quant-gen', 'skill-name-bioinfo',
                'skill-name-dataviz', 'skill-name-git', 'skill-name-shiny', 'skill-name-html'
             ];
             const skills = skillKeys.map(key => `• ${langContent[key] || key}`);
             
             if (skills.length > 0) {
                 const skillsToShow = skills; 
                 const half = Math.ceil(skillsToShow.length / 2);
                 const column1 = skillsToShow.slice(0, half);
                 const column2 = skillsToShow.slice(half);
                  const initialY = y;
                  const lineHeight = 12; 
                  checkPageBreak(Math.max(column1.length, column2.length) * lineHeight);
                  doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(80); 
                  doc.text(column1, margin, y, { lineHeightFactor: 1.15 });
                  if (column2.length > 0) {
                       doc.text(column2, margin + (max_width / 2), initialY, { lineHeightFactor: 1.15 });
                  }
                  y += Math.max(column1.length, column2.length) * lineHeight + 5; 
             }
             // --- FIM ALTERAÇÃO ---


            // --- ÁREAS DE ATUAÇÃO / EXPERTISE ---
            // --- ALTERAÇÃO (Sugestão 1: Refatoração do PDF) ---
            addSectionTitle(pdfStrings['expertise-title'] || (langContent['expertise-title'] || 'ÁREAS DE ATUAÇÃO'));
            const expertiseAreas = [
                { titleKey: 'exp-title1', descKey: 'exp-desc1' },
                { titleKey: 'exp-title2', descKey: 'exp-desc2' },
                { titleKey: 'exp-title3', descKey: 'exp-desc3' },
                { titleKey: 'exp-title4', descKey: 'exp-desc4' },
                { titleKey: 'exp-title5', descKey: 'exp-desc5' },
                { titleKey: 'exp-title7', descKey: 'exp-desc7' } // Vem do ID 'exp-title7' no HTML
            ];
            expertiseAreas.forEach(area => {
                const title = `• ${langContent[area.titleKey] || 'Area Title'}:`;
                const description = langContent[area.descKey] || 'Area Description';

                checkPageBreak(50); 
                doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(themeColor);
                const titleLines = doc.splitTextToSize(title, max_width);
                doc.text(titleLines, margin, y);
                y += titleLines.length * 12 + 2; 

                addJustifiedText(description, { x: margin + 8, width: max_width - 8, fontSize: 9 });
                y += item_gap / 2;
            });
            // --- FIM ALTERAÇÃO ---

            // --- FORMAÇÃO ACADÊMICA ---
                addSectionTitle(pdfStrings['education-title'] || (langContent['education-title'] || 'FORMAÇÃO ACADÊMICA'));

                // --- ALTERAÇÃO: Reestruturado para agrupar Pós-docs ---
                const educationData = [
                    // Doutorado em Estatística
                    { type: 'entry', date: 'edu-date1', title: 'edu-title1', institution: 'Universidade Federal de Viçosa (UFV)', advisor: 'edu-advisor1', details: 'edu-desc1' },
                    
                    // GRUPO DE PÓS-DOUTORADOS
                    {
                        type: 'group',
                        group_title: 'cv-edu-postdocs-title', // Chave "Pós-Doutorados"
                        items: [
                            // Pós-doc UFV
                            { date: 'edu-date2', title: 'edu-title2', institution: 'Universidade Federal de Viçosa (UFV) — FAPEMIG', advisor: 'edu-advisor2', details: 'edu-desc2' },
                            // Pós-doc Embrapa
                            { date: null, title: 'edu-title4', institution: 'EMBRAPA Mandioca e Fruticultura — CNPq', advisor: 'edu-advisor4', details: 'edu-desc4', year: '2022' }
                        ]
                    },

                    // Doutorado em Genética
                    { type: 'entry', date: null, title: 'edu-title5', institution: 'Universidade Federal de Viçosa (UFV)', advisor: 'edu-advisor5', details: 'edu-desc5', year: '2018 - 2022' },
                    
                    // Mestrado
                    { type: 'entry', date: null, title: 'edu-title6', institution: 'Universidade Federal de Viçosa (UFV)', advisor: 'edu-advisor6', details: 'edu-desc6', year: '2016 - 2018' },
                    
                    // Graduação
                    { type: 'entry', date: null, title: 'edu-title7', institution: 'Universidade Federal de Viçosa (UFV)', advisor: 'edu-advisor7', details: 'edu-desc7', year: '2010 - 2015' }
                ];
                
                // Lista de chaves de TÍTULO a pular no CV Profissional
                const pro_skip_keys = ['edu-title6', 'edu-title7'];

                educationData.forEach((item, index) => {
                    
                    // --- LÓGICA DE FILTRO CORRIGIDA ---
                    // Se for 'pro' E o item for uma 'entry' E seu título estiver na lista de pular
                    if (cvType === 'pro' && item.type === 'entry' && pro_skip_keys.includes(item.title)) {
                        return; // Pula Mestrado e Graduação no CV Pro
                    }

                    checkPageBreak(60);

                    // --- LÓGICA DE RENDERIZAÇÃO CORRIGIDA ---
                    
                    if (item.type === 'group') {
                        // --- INÍCIO DO BLOCO DE GRUPO (Pós-Doutorados) ---
                        
                        // 1. Renderiza o Título Principal do Grupo (ex: "Pós-Doutorados")
                        const groupTitle = langContent[item.group_title] || 'Pós-Doutorados';
                        doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(40).text(groupTitle, margin, y);
                        y += 12; // Espaçamento após o título do grupo

                        // 2. Itera sobre os sub-itens (UFV e Embrapa)
                        item.items.forEach(subItem => {
                            checkPageBreak(60);
                            
                            // Puxa os dados do sub-item
                            const date = subItem.year ? subItem.year : (langContent[subItem.date] || 'Date');
                            const institution = subItem.institution;
                            const advisorHTML = langContent[subItem.advisor] || '';
                            const details = langContent[subItem.details] || '';

                            // Renderiza Instituição e Data (sem título principal, como pedido)
                            doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(80).text(institution, margin, y);
                            doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(100).text(date, page_width - margin, y, { align: 'right' });
                            y += 12;

                            // Renderiza Advisor (com tradução correta)
                            if (advisorHTML) {
                                const cleanedAdvisor = this.stripHtml(advisorHTML);
                                let translatedAdvisor = cleanedAdvisor;
                                if (lang === 'pt') {
                                    translatedAdvisor = cleanedAdvisor.replace('Advisor:', 'Orientador:').replace('Co-advisor:', 'Coorientador:');
                                } else {
                                    translatedAdvisor = cleanedAdvisor.replace('Orientador:', 'Advisor:').replace('Coorientador:', 'Co-advisor:');
                                }
                                const advisorLines = doc.splitTextToSize(translatedAdvisor, max_width);
                                doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(100);
                                doc.text(advisorLines, margin, y);
                                y += advisorLines.length * 10 + 3;
                            }
                            
                            // Renderiza Detalhes (Sempre, para Pós-docs)
                            if (details) {
                                addJustifiedText(details, { fontSize: 8, width: max_width });
                            }
                            y += item_gap; // Gap entre os Pós-docs
                        });
                        // --- FIM DO BLOCO DE GRUPO ---

                    } else if (item.type === 'entry') {
                        // --- INÍCIO DO BLOCO NORMAL (PhD, MSc, BSc) ---
                        const title = langContent[item.title] || 'Title';
                        const date = item.year ? item.year : (langContent[item.date] || 'Date');
                        const institution = item.institution;
                        const advisorHTML = langContent[item.advisor] || '';
                        const details = langContent[item.details] || '';

                        // Renderiza Título e Data
                        doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(40).text(title, margin, y);
                        doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(100).text(date, page_width - margin, y, { align: 'right' });
                        y += 12;

                        // Renderiza Instituição
                        doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(80).text(institution, margin, y);
                        y += 12;

                        // Renderiza Advisor (com tradução correta)
                        if (advisorHTML) {
                            const cleanedAdvisor = this.stripHtml(advisorHTML);
                            let translatedAdvisor = cleanedAdvisor;
                            if (lang === 'pt') {
                                translatedAdvisor = cleanedAdvisor.replace('Advisor:', 'Orientador:').replace('Co-advisor:', 'Coorientador:');
                            } else {
                                translatedAdvisor = cleanedAdvisor.replace('Orientador:', 'Advisor:').replace('Coorientador:', 'Co-advisor:');
                            }
                            const advisorLines = doc.splitTextToSize(translatedAdvisor, max_width);
                            doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(100);
                            doc.text(advisorLines, margin, y);
                            y += advisorLines.length * 10 + 3;
                        }
                        
                        // LÓGICA DE DETALHES CORRIGIDA
                        // Mostra detalhes se:
                        // 1. For CV Acadêmico
                        // 2. Ou for CV Profissional E NÃO estiver na lista de pular (ou seja, mostra para PhDs)
                        if (details && (cvType !== 'pro' || !pro_skip_keys.includes(item.title))) {
                            addJustifiedText(details, { fontSize: 8, width: max_width });
                        }

                        y += item_gap; // Gap entre as entradas principais
                        // --- FIM DO BLOCO NORMAL ---
                    }
                });
             // --- FIM ALTERAÇÃO ---

            // --- PROJETOS ---
             // (Esta seção já estava boa, lendo do estado do módulo JS)
             addSectionTitle(pdfStrings['projects-title'] || (langContent['projects-title'] || 'PRINCIPAIS PROJETOS'));
             const reposToDisplay = (typeof GithubReposModule !== 'undefined' && GithubReposModule.state?.allRepos) ? GithubReposModule.state.allRepos : [];
             const maxProjects = (cvType === 'pro') ? 2 : 4; 
             reposToDisplay.slice(0, maxProjects).forEach(repo => {
                 checkPageBreak(50); 
                 const repoTitle = `• ${GithubReposModule.titleCase(repo.name)}`;
                 const linkUrl = repo.homepage || repo.html_url;
                 const viewSiteText = langContent['pdf-view-site'] || '[View Site]';
                 const viewRepoText = langContent['pdf-view-repo'] || '[Repository]';
                 const linkText = repo.homepage ? viewSiteText : viewRepoText;

                 doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(themeColor);
                 const titleWidth = doc.getTextWidth(repoTitle);
                  if (margin + titleWidth + 5 + doc.getTextWidth(linkText) < page_width - margin) {
                     doc.text(repoTitle, margin, y);
                     if (linkUrl) {
                         doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(40, 40, 255);
                          try { doc.textWithLink(linkText, margin + titleWidth + 5, y, { url: linkUrl }); } catch(e){}
                     }
                     y += 12;
                 } else { 
                     doc.text(repoTitle, margin, y);
                     y += 10;
                      if (linkUrl) {
                         doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(40, 40, 255);
                          try { doc.textWithLink(linkText, margin, y, { url: linkUrl }); } catch(e){}
                      }
                     y += 12;
                 }

                 addJustifiedText(repo.description || (langContent['no_description'] || 'No description provided.'), { x: margin + 8, width: max_width - 8, fontSize: 9 });
                 y += item_gap / 2;
             });
             if (reposToDisplay.length > maxProjects) {
                 doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(40, 40, 255);
                 const projectsPageUrl = `${window.location.origin}/projetos.html`;
                 const moreProjectsText = langContent['pdf-more-projects'] || 'For more projects, visit the projects page on the site.';
                  try { doc.textWithLink(moreProjectsText, margin, y, { url: projectsPageUrl }); } catch(e){ doc.text(moreProjectsText, margin, y); }
                 y += 15;
             }


            // --- PUBLICAÇÕES ---
             // (Esta seção já estava boa, lendo do estado do módulo JS)
             addSectionTitle(pdfStrings['publications-title'] || (langContent['publications-title'] || 'PRINCIPAIS PUBLICAÇÕES'));
             const articlesToDisplay = (typeof scholarScript !== 'undefined' && typeof scholarScript.allArticles === 'function') ? scholarScript.allArticles() : [];
             const maxPublications = (cvType === 'pro') ? 2 : 4; 
             articlesToDisplay.slice(0, maxPublications).forEach(art => {
                 checkPageBreak(60); 
                 doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(themeColor);
                 const titleLines = doc.splitTextToSize(`• ${art.title}`, max_width);
                 doc.text(titleLines, margin, y);
                 y += titleLines.length * 12 + 3; 

                 doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(80);
                 const metaTextParts = [];
                 if (art.journalTitle) metaTextParts.push(art.journalTitle);
                 if (art.year) metaTextParts.push(art.year);
                 const metaText = metaTextParts.length > 0 ? metaTextParts.join(' - ') : (langContent['pub-no-journal'] || 'N/A');
                 const metaLines = doc.splitTextToSize(metaText, max_width - 8); 
                 doc.text(metaLines, margin + 8, y);
                 y += metaLines.length * 11 + 3; 

                 if (art.cited_by?.value) {
                     doc.setFontSize(8).setFont('helvetica', 'italic').setTextColor(100); 
                     let citationText = (langContent['pdf-cited-by'] || 'Cited {count} times');
                     citationText = citationText.replace('{count}', art.cited_by.value);
                     doc.text(citationText, margin + 8, y);
                     y += 10;
                 }

                 if (art.doi && art.doiLink) {
                     doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(80); 
                     const doiLabel = "DOI: ";
                     doc.text(doiLabel, margin + 8, y);
                     const doiLabelWidth = doc.getTextWidth(doiLabel);
                     doc.setTextColor(40, 40, 255);
                     try {
                         doc.textWithLink(art.doi, margin + 8 + doiLabelWidth, y, { url: art.doiLink, maxWidth: max_width - 8 - doiLabelWidth }); 
                     } catch(e) {
                         doc.text(art.doi, margin + 8 + doiLabelWidth, y, { maxWidth: max_width - 8 - doiLabelWidth });
                     }
                     y += 10;
                 }
                 y += item_gap / 2;
             });
             if (articlesToDisplay.length > maxPublications) {
                 doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(40, 40, 255);
                 const publicationsPageUrl = `${window.location.origin}/publicacoes.html`;
                 const morePublicationsText = langContent['pdf-more-publications'] || 'For more publications, visit the publications page on the site.';
                  try { doc.textWithLink(morePublicationsText, margin, y, { url: publicationsPageUrl }); } catch(e){ doc.text(morePublicationsText, margin, y); }
                 y += 15;
             }

            // --- NOME DO ARQUIVO E SALVAMENTO ---
            let fileNameKey;
            if (cvType === 'pro') {
                fileNameKey = 'cv-file-name-pro';
            } else { 
                fileNameKey = 'cv-file-name-academic';
            }
            const fileName = langContent[fileNameKey] || `CV-Weverton_Gomes_da_Costa_${cvType}_${lang}.pdf`; 

            doc.save(fileName);

            if (toast) {
                toast.textContent = langContent['cv-download-started'] || 'Download iniciado!';
                toast.style.backgroundColor = '';
            }

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            if (toast) {
                toast.textContent = `${langContent['cv-error'] || 'Erro ao gerar PDF.'} ${error.message ? `(${error.message})` : ''}`;
                toast.style.backgroundColor = 'var(--error)';
            }
        } finally {
            clickedButton.innerHTML = originalButtonHTML;
            clickedButton.style.pointerEvents = 'auto';
            clickedButton.removeAttribute('data-generating'); 
            setTimeout(() => { if (toast) toast.classList.remove('show'); }, 3000);
        }
    }
};

// =================================================================================
// Módulo: Copiar para a Área de Transferência
// =================================================================================
const ClipboardCopier = {
    init() {
        const emailToCopy = 'wevertonufv@gmail.com';

        const copyTriggers = [
            document.getElementById('copy-email-link'),
            document.getElementById('copy-email-footer')
        ];

        copyTriggers.forEach(trigger => {
            if (trigger) {
                trigger.addEventListener('click', (event) => {
                    event.preventDefault(); 
                    this.copyToClipboard(emailToCopy);
                });
            }
        });
    },

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            const successMessage = (typeof translations !== 'undefined' && translations[currentLang]?.emailCopied)
                ? translations[currentLang].emailCopied
                : 'E-mail copiado para a área de transferência!';
            this.showToast(successMessage);
        }).catch(err => {
            console.error('Falha ao copiar o texto: ', err);
            const errorMessage = (typeof translations !== 'undefined' && translations[currentLang]?.emailCopyFailed)
                ? translations[currentLang].emailCopyFailed
                : 'Falha ao copiar e-mail.';
            this.showToast(errorMessage, true);
        });
    },

    showToast(message, isError = false) {
        const toast = document.getElementById('toast-notification');
        if (toast) {
            toast.textContent = message;
            toast.style.backgroundColor = isError ? 'var(--error)' : 'var(--primary)';
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => { toast.style.backgroundColor = ''; }, 500);
            }, 3000);
        }
    }
};

// =================================================================================
// MÓDULO DE TRADUÇÃO E ESTADO GLOBAL
// --- ALTERAÇÃO: Modificado para carregar ambos JSONs com Promise.all ---
// =================================================================================

const LanguageManager = {
    currentLang: 'pt',
    _events: {},
    emitter: {
        on: (event, callback) => {
            if (!LanguageManager._events[event]) LanguageManager._events[event] = [];
            LanguageManager._events[event].push(callback);
        },
        emit: (event, data) => {
            if (!LanguageManager._events[event]) return;
            LanguageManager._events[event].forEach(callback => callback(data));
        }
    },

    /**
     * Ponto de entrada do módulo.
     * Carrega translations.json e fallback-data.json, depois inicializa o resto.
     */
    init() {
        console.log("LanguageManager.init: Iniciando carregamento de JSONs...");

        // Expõe o listener do emitter imediatamente
        window.AppEvents = { on: this.emitter.on.bind(this.emitter) };

        // --- ALTERAÇÃO: Carrega ambos os JSONs ---
        Promise.all([
            fetch('translations.json').then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status} ao buscar translations.json`);
                return response.json();
            }),
            fetch('fallback-data.json').then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status} ao buscar fallback-data.json`);
                return response.json();
            })
        ])
        .then(([translationsData, fallbackData]) => {
            console.log("LanguageManager.init: JSONs carregados com sucesso.");
            window.translations = translationsData; // Armazena traduções globalmente
            window.fallbackData = fallbackData;     // Armazena fallback data globalmente

            // 1. Define o idioma inicial (dispara evento 'languageChanged')
            this.setLanguage(this.currentLang);

            // 2. Inicializa os componentes da página AGORA que os dados estão prontos
            initializePageComponents();

        })
        .catch(error => {
            console.error("FALHA CRÍTICA AO CARREGAR ARQUIVOS JSON:", error);
            document.body.innerHTML = '<div style="color:red; padding: 20px;">Erro crítico: Não foi possível carregar dados essenciais (traduções ou fallback). Verifique o console.</div>';
        });
        // --- FIM ALTERAÇÃO ---
    },
    
    subtitleState: {
        timeout: null,
        index: 0,
        charIndex: 0,
        isDeleting: false,
    },

    toggleLanguage() {
        const newLang = this.currentLang === 'pt' ? 'en' : 'pt';
        this.setLanguage(newLang);
    },

    setLanguage(lang) {
        if (!translations[lang]) return;

        // 1. Define o estado global e o atributo da página
        this.currentLang = lang;
        window.currentLang = lang; 
        document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';

        // 2. Atualiza títulos da página e navegação com base no ID do body
        this._updatePageTitles(lang);

        // 3. Atualiza todos os elementos de conteúdo com base nos atributos `data-key`
        this._updateTextContent(lang);

        // 4. Atualiza a UI do seletor de idioma
        this._updateLanguageSwitcherUI(lang);

        // 5. Reinicia a animação do subtítulo
        this._restartSubtitleAnimation();
        
        // 6. Notifica outros módulos para se atualizarem com o novo idioma
        this._notifyOtherScripts();
        
        if (window.pageSetupScript && typeof window.pageSetupScript.updateTimelineButtons === 'function') {
            window.pageSetupScript.updateTimelineButtons();
        }
    },
    
    typeAndEraseSubtitle() {
        const subtitleEl = document.getElementById('subtitle');
        if (!subtitleEl) return;

        clearTimeout(this.subtitleState.timeout);

        const phrases = [
            translations[this.currentLang]['subtitle-1'],
            translations[this.currentLang]['subtitle-2'],
            translations[this.currentLang]['subtitle-3'],
            translations[this.currentLang]['subtitle-4']
        ].filter(Boolean); 

        if (phrases.length === 0) return;

        const state = this.subtitleState;
        const currentPhrase = phrases[state.index];
        let typeSpeed = 100;

        if (state.isDeleting) {
            state.charIndex--;
        } else {
            state.charIndex++;
        }

        subtitleEl.innerHTML = currentPhrase.substring(0, state.charIndex);

        if (!state.isDeleting && state.charIndex === currentPhrase.length) {
            state.isDeleting = true;
            typeSpeed = 2000; 
        } else if (state.isDeleting && state.charIndex === 0) {
            state.isDeleting = false;
            state.index = (state.index + 1) % phrases.length;
            typeSpeed = 500; 
        }

        state.timeout = setTimeout(() => this.typeAndEraseSubtitle(), typeSpeed);
    },

    // --- Métodos Privados Auxiliares ---
    _updatePageTitles(lang) {
        const bodyId = document.body.id || '';
        let pageTitleKey = 'page-title'; 
        let navTitleKey = '';

        if (bodyId.includes('projects')) {
            pageTitleKey = 'projects-page-title';
            navTitleKey = 'nav-title-projects';
        } else if (bodyId.includes('publications')) {
            pageTitleKey = 'publications-page-title';
            navTitleKey = 'nav-title-publications';
        } else if (bodyId.includes('privacy')) {
            pageTitleKey = 'privacy-page-title';
            navTitleKey = 'nav-title-privacy';
        }

        document.title = translations[lang][pageTitleKey] || 'Página';
        
        const navTitleEl = document.querySelector('.nav-title');
        if (navTitleEl && navTitleKey) {
            navTitleEl.textContent = translations[lang][navTitleKey];
        }
    },

    _updateTextContent(lang) {
        document.querySelectorAll('[data-key]').forEach(el => {
            const key = el.dataset.key;
            const translation = translations[lang][key];
            if (translation) el.innerHTML = translation;
        });

        document.querySelectorAll('[data-key-placeholder]').forEach(el => {
            el.placeholder = translations[lang][el.dataset.keyPlaceholder] || '';
        });
        document.querySelectorAll('[data-key-title]').forEach(el => {
            el.title = translations[lang][el.dataset.keyTitle] || '';
        });
        document.querySelectorAll('[data-key-aria-label]').forEach(el => {
            el.setAttribute('aria-label', translations[lang][el.dataset.keyAriaLabel] || '');
        });
    },

    _updateLanguageSwitcherUI(lang) {
        const isPt = lang === 'pt';
        document.querySelectorAll('.lang-switcher, .lang-switch-fixed, .lang-switch').forEach(button => {
            button.querySelector('.lang-pt')?.classList.toggle('active', isPt);
            button.querySelector('.lang-en')?.classList.toggle('active', !isPt);
        });
    },

    _restartSubtitleAnimation() {
        if (document.getElementById('subtitle')) {
            clearTimeout(this.subtitleState.timeout);
            this.subtitleState.index = 0;
            this.subtitleState.charIndex = 0;
            this.subtitleState.isDeleting = false;
            this.typeAndEraseSubtitle();
        }
    },
    
    _notifyOtherScripts() {
        // --- ALTERAÇÃO (Sugestão 2: Pub/Sub) ---
        // Dispara o evento global. Módulos inscritos irão reagir.
        this.emitter.emit('languageChanged', this.currentLang);
        // --- FIM ALTERAÇÃO ---
    }
};

// Expor globalmente a função de alternância para ser usada no HTML (ex: onclick)
window.toggleLanguage = () => LanguageManager.toggleLanguage();


// =================================================================================
// MÓDULO PRINCIPAL DA APLICAÇÃO (UI & Interações)
// =================================================================================

const App = {
    UI: { // Cache para elementos do DOM
        nav: null,
        header: null,
        body: null,
        backToTopButton: null,
        timeline: null,
        copyEmailLink: null,
        toast: null
    },

    init() {
        console.log("App.init: Cacheando DOM e configurando listeners...");
        this._cacheDOMElements();
        this._initSetup();
    },

    _cacheDOMElements() {
        this.UI.nav = document.querySelector('nav');
        this.UI.header = document.querySelector('header');
        this.UI.body = document.body;
        this.UI.backToTopButton = document.querySelector('.back-to-top');
        this.UI.timeline = document.querySelector('.timeline');
        this.UI.copyEmailLink = document.getElementById('copy-email-link');
        this.UI.toast = document.getElementById('toast-notification');
    },

    _initSetup() {
        this._setupObservers();
        this._setupEventListeners();
    },

    // --- Configuração de Observadores (Animações de Scroll) ---
    _setupObservers() {
        this._setupRevealObserver();
        this._setupSkillObserver();
        this._setupNavObserver();
        this._setupStaggerEffect();
    },

    _setupRevealObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add('visible');
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    },

    _setupSkillObserver() {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    const level = entry.target.dataset.level;
                    const bar = entry.target.querySelector('.skill-bar');
                    if (bar && level) {
                        bar.style.setProperty('--proficiency-level', level);
                    }
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        document.querySelectorAll('.skill-item').forEach(el => observer.observe(el));
    },

    _setupNavObserver() {
        const sections = document.querySelectorAll('main > section[id]');
        const navLinks = document.querySelectorAll('nav .nav-link');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${id}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, { rootMargin: '-40% 0px -60% 0px' });
        sections.forEach(section => observer.observe(section));
    },

    _setupStaggerEffect() {
        document.querySelectorAll('.stagger-children').forEach(container => {
            container.querySelectorAll('.reveal, .skill-item').forEach((child, index) => {
                child.style.setProperty('--stagger-index', index);
            });
        });
    },

    // --- Configuração de Listeners de Eventos ---
    _setupEventListeners() {
        window.addEventListener('scroll', this._handleScroll.bind(this), { passive: true });
        this.UI.body.addEventListener('mousemove', this._handleCardHover.bind(this));

        if (this.UI.timeline) {
            this.UI.timeline.addEventListener('click', this._handleTimelineToggle.bind(this));
        }
        if (this.UI.copyEmailLink) {
            this.UI.copyEmailLink.addEventListener('click', this._handleEmailCopy.bind(this));
        }
    },

    // --- Manipuladores de Eventos (Handlers) ---
    _handleScroll() {
        const scrollY = window.scrollY;
        
        if (this.UI.nav) {
            const isScrolled = this.UI.header 
                ? scrollY > this.UI.header.offsetHeight - 100 
                : scrollY > 50;
            this.UI.nav.classList.toggle('scrolled', isScrolled);
            if (this.UI.header) this.UI.body.classList.toggle('scrolled', isScrolled);
        }

        if (this.UI.backToTopButton) {
            this.UI.backToTopButton.classList.toggle('visible', scrollY > 300);
        }
    },

    _handleCardHover(event) {
        const card = event.target.closest('.card');
        if (card) {
            const rect = card.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        }
    },

    _handleTimelineToggle(event) {
        const button = event.target.closest('.toggle-details-btn');
        if (!button) return;

        const item = button.closest('.timeline-item');
        item.classList.toggle('expanded');

        const lang = LanguageManager.currentLang;
        const moreText = translations[lang]['toggle-details-more'] || 'Ver mais';
        const lessText = translations[lang]['toggle-details-less'] || 'Ver menos';
        
        button.textContent = item.classList.contains('expanded') ? lessText : moreText;

        const details = item.querySelector('.timeline-details');
        if (item.classList.contains('expanded') && details.dataset.key) {
            details.innerHTML = translations[lang][details.dataset.key] || '';
        }
    },

    _handleEmailCopy(event) {
        event.preventDefault();
        const emailToCopy = 'wevertonufv@gmail.com';
        navigator.clipboard.writeText(emailToCopy)
            .then(() => this.showToast(`Email: ${emailToCopy} copiado!`))
            .catch(err => {
                console.error('Falha ao copiar email: ', err);
                this.showToast('Falha ao copiar o email.');
            });
    },

    // --- Funções Utilitárias ---
    showToast(message) {
        if (this.UI.toast) {
            this.UI.toast.textContent = message;
            this.UI.toast.classList.add('show');
            setTimeout(() => this.UI.toast.classList.remove('show'), 3000);
        }
    },
};

// =================================================================================
// Inicialização Centralizada dos Módulos
// --- ALTERAÇÃO: Simplificada, chamada após carregamento dos JSONs ---
// =================================================================================
function initializePageComponents() {
    console.log("initializePageComponents: Iniciando módulos..."); // Log para depuração
    // Não precisa mais verificar window.fallbackData aqui
    ParticleBackground.init();
    MobileNavHandler.init();
    PageSetup.init(); // PageSetup agora reage ao evento 'languageChanged' para a primeira atualização
    ClipboardCopier.init();
    ContactForm.init();
    CvPdfGenerator.init();
    scholarScript.init();
    App.init(); // App gerencia UI geral, observers, etc.

    // Inicializa GithubReposModule SE o elemento existir
    if (document.getElementById('projects-list')) {
        GithubReposModule.init({
            listSelector: '#projects-list',
            metaSelector: '#projects-meta',
            searchSelector: '#project-search',
            clearBtnSelector: '#clear-btn',
            loadMoreBtnSelector: document.getElementById('toggle-more') ? '#toggle-more' : undefined,
            shownCountSelector: '#shown-count',
            isPaginated: !!document.getElementById('toggle-more'),
            initialCount: 3,
            incrementCount: 3
        });
    }
    console.log("initializePageComponents: Módulos inicializados."); // Log para depuração
}

// --- ALTERAÇÃO: Função removida, lógica integrada no LanguageManager.init ---
// function waitForFallbackDataAndInitialize() { /* ... REMOVIDO ... */ }
// --- FIM ALTERAÇÃO ---

// =================================================================================
// PONTO DE ENTRADA PRINCIPAL
// --- ALTERAÇÃO: Apenas chama LanguageManager.init que agora orquestra tudo ---
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded: Evento disparado. Iniciando LanguageManager...");
    LanguageManager.init(); // LanguageManager agora carrega JSONs e chama initializePageComponents
});