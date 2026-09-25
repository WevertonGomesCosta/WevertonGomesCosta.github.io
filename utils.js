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
// MÓDULO: Perfil Canônico Gerado
// =================================================================================
const SiteProfile = {
    cached: undefined,

    get() {
        if (this.cached !== undefined) return this.cached;

        const node = document.getElementById('site-profile-data');
        if (!node) {
            console.error('SiteProfile: projeção canônica #site-profile-data não encontrada.');
            this.cached = null;
            return null;
        }

        try {
            const parsed = JSON.parse(node.textContent || '');
            if (!parsed || typeof parsed !== 'object' || !parsed.person || !parsed.profiles) {
                throw new Error('estrutura de perfil inválida');
            }
            this.cached = parsed;
            return parsed;
        } catch (error) {
            console.error('SiteProfile: falha ao ler a projeção canônica.', error);
            this.cached = null;
            return null;
        }
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
            const explicitDate = privacyUpdateEl.dataset.lastUpdated;
            const privacyDate = explicitDate ? new Date(`${explicitDate}T12:00:00`) : lastModifiedDate;
            privacyUpdateEl.textContent = DateFormatter.format(privacyDate);
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
// MÓDULO: DASHBOARD ACADÊMICO (FINAL: ANIMAÇÃO DE NÚMEROS E GRÁFICOS)
// =================================================================================
const scholarScript = (function() {
    'use strict';

    const initialPubsToShow = 3; 
    const pubsPerLoad = 3;        
    const platformOrder = ['scholar', 'scopus', 'wos', 'max'];

    let dashboardData = { scholar: null, scopus: null, wos: null, max: null };
    let allArticles = [];
    let allWorks = [];
    let showingPubsCount = 0;
    let activeYearFilter = null;
    let activePublicationCategory = 'articles';
    let isPublicationsPage = false;
    let currentSlideIndex = 0;
    let hasViewedSection = false;

    // --- UI References ---
    const UI = {
        track: null, slides: [],
        nextBtn: null, prevBtn: null, dots: [],
        pubsGrid: null,
        pubSearchInput: null, pubClearBtn: null,
        pubTypeButtons: [],
        pubsShownCount: null, pubsLoadMoreBtn: null,
        dashboardSection: null,
        exportBtn: null
    };

    // --- CARREGAMENTO ---
    async function ensureTranslationsLoaded() {
        if (window.translations && window.translations['pt']) return;
        try {
            const response = await fetch('translations.json');
            if (!response.ok) throw new Error('HTTP');
            window.translations = await response.json();
        } catch (e) { window.translations = { pt: {}, en: {} }; }
    }

    async function ensureAcademicRegistryLoaded() {
        if (window.academicRegistry?.works) return;
        try {
            const response = await fetch('academic-registry.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            window.academicRegistry = await response.json();
        } catch (e) {
            console.warn('Academic registry unavailable; falling back to bibliometric source data.', e);
            window.academicRegistry = null;
        }
    }

    // --- HELPERS ---
    const normalizeTitle = (str) => str ? str.replace(/<[^>]+>/g, '').toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_\`~()]/g, "").replace(/\s\s+/g, ' ').trim() : '';

    const normalizeIdentityTitle = (str) => str
        ? str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[‐‑‒–—−]/g, '-')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        : '';

    const scholarCitationCount = (work, scholarArticles = []) => {
        const target = normalizeIdentityTitle(work?.title || '');
        if (!target) return 0;

        let match = scholarArticles.find(article =>
            normalizeIdentityTitle(article?.title || '') === target
        );

        if (!match) {
            match = scholarArticles.find(article => {
                const rawTitle = article?.title || '';
                if (!/[.…]$/.test(rawTitle.trim())) return false;
                const candidate = normalizeIdentityTitle(rawTitle.replace(/[.…]+$/, ''));
                return candidate.length >= 60 && target.startsWith(candidate);
            });
        }

        const value = match?.cited_by?.value ?? match?.cited_by ?? 0;
        return parseInt(value, 10) || 0;
    };
    
    const normalizeArticle = (rawArt, scholarArticles = []) => {
        const isCanonical = !!(rawArt?.id && rawArt?.type && rawArt?.status);
        let cites = 0;

        const isCitableCanonicalWork = isCanonical && (
            (rawArt.type === 'journal_article' && rawArt.status === 'published') ||
            rawArt.type === 'preprint'
        );

        if (isCitableCanonicalWork) cites = scholarCitationCount(rawArt, scholarArticles);
        else if (!isCanonical && rawArt.cited_by && typeof rawArt.cited_by === 'object') cites = rawArt.cited_by.value || 0;
        else if (!isCanonical) cites = parseInt(rawArt.cited_by) || 0;

        const year = (rawArt.year || rawArt.ano || '0000').toString().replace(/\D/g, '').substring(0, 4);
        const doi = rawArt.doi || '';
        const doiLink = rawArt.doiLink || (doi ? `https://doi.org/${doi}` : null);

        return {
            id: rawArt.id || null,
            type: rawArt.type || 'journal_article',
            status: rawArt.status || 'published',
            title: rawArt.title || 'Sem título',
            authors: Array.isArray(rawArt.authors) ? rawArt.authors : [],
            year,
            journalTitle: rawArt.container_title || rawArt.journalTitle || rawArt.journal || '',
            publisher: rawArt.publisher || '',
            pages: rawArt.pages || '',
            isbn: rawArt.isbn || '',
            link: doiLink || rawArt.link || null,
            doi,
            doiLink,
            lattesPosition: rawArt.lattes?.position ?? null,
            cited_by: { value: cites }
        };
    };

    // --- ANIMAÇÃO DE NÚMEROS ---
    function animateCountUp(el, value) {
        if (!el) return;
        if (el.dataset.animId) cancelAnimationFrame(el.dataset.animId);
        if (value === null || value === undefined) { el.textContent = "-"; return; }
        
        let target = parseInt(value, 10);
        if (isNaN(target)) { el.textContent = value; return; }

        el.textContent = "0"; // Reset visual

        const duration = 1200; 
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            
            const currentVal = Math.floor(ease * target);
            el.textContent = currentVal.toLocaleString(window.currentLang === 'pt' ? 'pt-BR' : 'en-US');

            if (progress < 1) {
                el.dataset.animId = requestAnimationFrame(update);
            } else {
                el.textContent = target.toLocaleString(window.currentLang === 'pt' ? 'pt-BR' : 'en-US');
                delete el.dataset.animId;
            }
        }
        el.dataset.animId = requestAnimationFrame(update);
    }

    // --- PROCESSAMENTO ---
    function processPlatformData(platformPrefix, dataKey) {
        const fb = window.fallbackData;
        if (!fb) return null;
        const acad = fb.academicData || fb;
        const data = acad[dataKey]; 

        let result = { metrics: { cit: { all: 0, recent: null }, h: { all: 0, recent: null }, i10: { all: 0, recent: null }, pubs: 0 }, graphData: [] };
        if (data) {
            const citedBy = data.cited_by || data.profile?.cited_by;
            const totalPubs = data.total_publications || data.profile?.total_publications;

            if (citedBy?.table) {
                const getVals = (row) => {
                    if (!row) return { all: 0, recent: null };
                    const key = Object.keys(row)[0]; const obj = row[key];
                    const recentKey = Object.keys(obj).find(k => k.startsWith('since_') || k.startsWith('desde_'));
                    return { all: (obj.all != null) ? obj.all : 0, recent: (recentKey && obj[recentKey] != null) ? obj[recentKey] : null };
                };
                if(citedBy.table[0]) result.metrics.cit = getVals(citedBy.table[0]);
                if(citedBy.table[1]) result.metrics.h = getVals(citedBy.table[1]);
                if(citedBy.table[2]) result.metrics.i10 = getVals(citedBy.table[2]);
            } else if (Array.isArray(data.articles)) result.metrics.cit.all = data.articles.length;

            if (totalPubs != null) result.metrics.pubs = totalPubs;
            else if (Array.isArray(data.articles)) result.metrics.pubs = data.articles.length;
            if (citedBy?.graph) result.graphData = citedBy.graph;
        }
        return result;
    }

    // --- RENDERIZAÇÃO ---
    function renderPlatform(platformPrefix, shouldAnimate = true) {
        const data = dashboardData[platformPrefix];
        if (!data) return;

        // Animação dos Números
        ['cit', 'h', 'i10', 'pubs'].forEach(metric => {
            const el = document.getElementById(`${platformPrefix}-${metric}`);
            if(el) {
                const val = (metric === 'pubs') ? data.metrics.pubs : data.metrics[metric].all;
                if (shouldAnimate) animateCountUp(el, val);
                else el.textContent = val.toLocaleString(window.currentLang === 'pt' ? 'pt-BR' : 'en-US');
            }
        });

        updatePeriodLabels(platformPrefix, data.metrics);

        // Renderização do Gráfico (passando shouldAnimate)
        const chartDiv = document.getElementById(`${platformPrefix}-chart`);
        if (chartDiv) {
             // Se o container estiver vazio ou com mensagem de erro, ou se for para animar, renderiza
            if (!chartDiv.innerHTML || chartDiv.innerHTML.includes('Sem dados') || shouldAnimate) {
                if (data.graphData?.length > 0) {
                    renderDualAxisChart(chartDiv, data.graphData, platformPrefix, shouldAnimate);
                } else {
                    chartDiv.innerHTML = "<div style='text-align:center;padding:20px;color:#888;font-size:0.9rem'>Sem dados históricos</div>";
                }
            }
        }
    }

    function updatePeriodLabels(prefix, metrics) {
        const t = window.translations?.[window.currentLang] || {};
        const sinceText = (t['metric-since'] || 'Since 2021').replace(/\d{4}/, '2021');

        ['cit', 'h', 'i10'].forEach(key => {
            const valObj = metrics[key];
            const periodId = `${prefix}-${key}-period`;
            let elPeriod = document.getElementById(periodId);
            const elMain = document.getElementById(`${prefix}-${key}`);

            if (!elPeriod && elMain) {
                elPeriod = document.createElement('span'); elPeriod.id = periodId;
                elMain.insertAdjacentElement('afterend', elPeriod);
            }
            if (elPeriod) {
                if (valObj.recent) {
                    elPeriod.innerHTML = ` / ${valObj.recent} <span style="font-size:0.7em; opacity:0.8;">(${sinceText})</span>`;
                    elPeriod.style.display = 'inline'; elPeriod.style.marginLeft = '5px'; elPeriod.style.fontWeight = 'normal';
                } else elPeriod.style.display = 'none';
            }
        });
    }

    function updateAllTexts() {
        platformOrder.forEach(p => renderPlatform(p, false));
        renderPublications();
        // Se já viu a seção, reanima apenas o gráfico atual ao trocar idioma (opcional, aqui deixei false para não distrair)
        if (hasViewedSection && window.Plotly?.Plots?.resize) {
            setTimeout(() => {
                platformOrder.forEach(p => {
                    const chartDiv = document.getElementById(`${p}-chart`);
                    if (chartDiv) window.Plotly.Plots.resize(chartDiv);
                });
            }, 300);
        }
    }

    // --- GRÁFICO OTIMIZADO (DESIGN MODERNO + MOBILE TOUCH) ---
    function renderDualAxisChart(container, rawData, platform, shouldAnimate) {
        const t = window.translations?.[window.currentLang] || {};
        const active = rawData.filter(d => d.citations > 0 || d.publications > 0);
        
        if (!active.length) { 
            container.innerHTML = "<div style='text-align:center;padding:20px;color:#888;'>Sem atividade</div>"; 
            return; 
        }

        const years = active.map(d => parseInt(d.year)).filter(y => !isNaN(y));
        const minYear = Math.min(...years), maxYear = Math.max(...years);
        
        // Dados processados completos
        const processed = [];
        for (let y = minYear; y <= maxYear; y++) {
            const ext = rawData.find(d => parseInt(d.year) === y);
            processed.push({ year: y, cit: ext?.citations || 0, pub: ext?.publications || 0 });
        }

        // --- CÁLCULOS DE LIMITES ---
        const maxPubVal = Math.max(...processed.map(d => d.pub));
        const maxCitVal = Math.max(...processed.map(d => d.cit));
        const rangePub = [0, maxPubVal > 0 ? maxPubVal * 1.1 : 5]; 
        const rangeCit = [0, maxCitVal > 0 ? maxCitVal * 1.1 : 10];
        const rangeX = [minYear - 0.5, maxYear + 0.5];

        const color = { scholar: '#4285F4', scopus: '#ff7f0e', wos: '#8b5cf6', max: '#F59E0B' }[platform] || '#10b981';
        const lblPubs = t['chart-pubs'] || (window.currentLang === 'pt' ? 'Publicações' : 'Publications');
        const lblCits = t['chart-cits'] || (window.currentLang === 'pt' ? 'Citações' : 'Citations');

        // Dimensões
        const isMobile = window.innerWidth < 768;
        let targetWidth = container.getBoundingClientRect().width;
        if (targetWidth < 50) targetWidth = window.innerWidth - (isMobile ? 40 : 80);
        const chartHeight = isMobile ? 260 : 350; 

        // Configuração de Velocidade da Animação
        const totalDurationTarget = 1500; 
        const stepDuration = Math.max(50, Math.min(300, totalDurationTarget / processed.length));

        // --- CONFIGURAÇÃO VISUAL (LAYOUT) ---
        const layout = {
            width: targetWidth, 
            height: chartHeight,
            paper_bgcolor: 'rgba(0,0,0,0)', 
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#94a3b8', family: 'Inter, sans-serif' }, // Cor Slate-400
            
            // Lenda
            legend: { 
                orientation: 'h', 
                x: 0, 
                y: isMobile ? 1.2 : 1.1,
                font: { size: 12, color: '#cbd5e1' } // Texto mais claro
            },
            
            margin: { t: 40, l: 30, r: 30, b: 30 }, 

            // --- INTERAÇÃO MOBILE E DESIGN DO TOOLTIP (AQUI ESTÁ A MUDANÇA) ---
            hovermode: 'x unified', // Garante que uma linha vertical mostre todos os dados (bom para celular)
            hoverlabel: {
                bgcolor: 'rgba(15, 23, 42, 0.95)', // Fundo Slate-900 quase opaco (Efeito Glass)
                bordercolor: 'rgba(255, 255, 255, 0.1)', // Borda sutil
                font: { 
                    family: 'Inter, sans-serif', 
                    size: 14, 
                    color: '#f8fafc' // Texto branco brilhante
                },
                namelength: -1 // Mostra nome completo sempre
            },
            // ------------------------------------------------------------------

            xaxis: { 
                gridcolor: 'rgba(255,255,255,0.05)', // Grid muito sutil
                showgrid: false, 
                type: 'linear', 
                fixedrange: true, // Impede zoom acidental no celular
                tickfont: { size: isMobile ? 10 : 11, color: '#64748b' },
                range: rangeX,
                tickmode: 'linear',
                dtick: 1, 
                tickangle: isMobile ? -45 : 0 
            },
            yaxis: { 
                title: { text: isMobile ? '' : lblCits, font:{color, size:11}}, 
                gridcolor: 'rgba(255,255,255,0.05)', 
                showgrid: true, 
                tickfont:{color, size: 10}, 
                fixedrange: true,
                range: rangeCit 
            },
            yaxis2: { 
                title: { text: isMobile ? '' : lblPubs, font:{color:'#64748b', size:11}}, 
                overlaying: 'y', 
                side: 'right', 
                showgrid:false, 
                tickfont:{color:'#64748b', size: 10}, 
                fixedrange: true,
                range: rangePub 
            },
            dragmode: false, 
            transition: {
                duration: stepDuration, 
                easing: 'linear'
            }
        };

        const config = { responsive: true, displayModeBar: false, staticPlot: false };

        const getTraces = (dataSubset) => {
            return [
                { 
                    x: dataSubset.map(d=>d.year), 
                    y: dataSubset.map(d=>d.pub), 
                    name: lblPubs, 
                    type: 'bar', 
                    yaxis: 'y2', 
                    // Barras com cor branca sutil e transparente
                    marker:{color:'rgba(255,255,255,0.1)', line:{color:'rgba(255,255,255,0.2)', width:1}},
                    hoverinfo: 'y+name' // Mostra apenas valor e nome no tooltip
                },
                { 
                    x: dataSubset.map(d=>d.year), 
                    y: dataSubset.map(d=>d.cit), 
                    name: lblCits, 
                    type: 'scatter', 
                    mode:'lines+markers', 
                    // Linha mais grossa e suave
                    line:{color, width:3, shape:'spline', smoothing: 1.3}, 
                    marker:{size:6, color: '#0f172a', line:{color: color, width: 2}}, // Bolinha escura com borda colorida
                    hoverinfo: 'y+name'
                }
            ];
        };

        // --- LÓGICA DE EXECUÇÃO (Animação vs Estático) ---
        if (shouldAnimate) {
            Plotly.newPlot(container, getTraces([]), { ...layout, transition: { duration: 0 } }, config)
                .then(() => {
                    let currentIndex = 0;
                    function runSequence() {
                        if (currentIndex >= processed.length) return;
                        const currentSubset = processed.slice(0, currentIndex + 1);
                        Plotly.react(container, getTraces(currentSubset), layout, config);
                        currentIndex++;
                        setTimeout(runSequence, stepDuration);
                    }
                    setTimeout(runSequence, 100);
                });
        } else {
            const staticLayout = { ...layout, transition: { duration: 0 } };
            Plotly.newPlot(container, getTraces(processed), staticLayout, config);
        }

        // --- INTERAÇÃO AO CLICAR ---
        container.on('plotly_click', d => {
            if (!d.points || !d.points[0]) return;
            const y = d.points[0].x;
            activeYearFilter = (activeYearFilter == y) ? null : y;
            showingPubsCount = initialPubsToShow;
            renderPublications();
            updateFilterUI(); // Função auxiliar para destacar o botão/filtro visualmente se existir
        });
    }

    // --- CARROSSEL ---
    function updateCarouselPosition() {
        if (!UI.track || !UI.slides.length) return;
        const width = UI.slides[0].getBoundingClientRect().width;
        UI.track.style.transform = `translateX(-${width * currentSlideIndex}px)`;
        UI.slides.forEach((s, i) => s.classList.toggle('current-slide', i === currentSlideIndex));
        UI.dots.forEach((d, i) => {
            const isCurrent = i === currentSlideIndex;
            d.classList.toggle('current-slide', isCurrent);
            if (isCurrent) d.setAttribute('aria-current', 'true');
            else d.removeAttribute('aria-current');
        });

        // TRIGGER DE ANIMAÇÃO AO TROCAR SLIDE
        const currentPlatform = platformOrder[currentSlideIndex];
        if (currentPlatform && hasViewedSection) {
            // Espera o carrossel deslizar um pouco e dispara a animação
            setTimeout(() => renderPlatform(currentPlatform, true), 200);
        }
    }

    function initCarouselLogic() {
        if (!UI.track) return;
        const moveNext = () => { currentSlideIndex = (currentSlideIndex + 1) % UI.slides.length; updateCarouselPosition(); };
        const movePrev = () => { currentSlideIndex = (currentSlideIndex - 1 + UI.slides.length) % UI.slides.length; updateCarouselPosition(); };

        if(UI.nextBtn) UI.nextBtn.addEventListener('click', moveNext);
        if(UI.prevBtn) UI.prevBtn.addEventListener('click', movePrev);
        UI.dots.forEach((dot, i) => dot.addEventListener('click', () => { currentSlideIndex = i; updateCarouselPosition(); }));

        // GESTOS MOBILE (SWIPE + SCROLL LOCK)
        let touchStartX = 0; let touchStartY = 0; let isSwiping = false;

        UI.track.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX; touchStartY = e.changedTouches[0].screenY; isSwiping = false;
        }, {passive: true}); 

        UI.track.addEventListener('touchmove', e => {
            const touchCurrentX = e.changedTouches[0].screenX; const touchCurrentY = e.changedTouches[0].screenY;
            const diffX = Math.abs(touchCurrentX - touchStartX); const diffY = Math.abs(touchCurrentY - touchStartY);
            if (diffX > diffY && diffX > 10) { isSwiping = true; if(e.cancelable) e.preventDefault(); }
        }, {passive: false});

        UI.track.addEventListener('touchend', e => {
            if (!isSwiping) return; 
            const touchEndX = e.changedTouches[0].screenX; const threshold = 40;
            if (touchEndX < touchStartX - threshold) moveNext();
            if (touchEndX > touchStartX + threshold) movePrev();
        }, {passive: true});
        
        window.addEventListener('resize', updateCarouselPosition);
    }

    // --- LISTA E EXPORTAÇÃO ---
    const publicationCategoryMatches = (work, category) => {
        if (category === 'chapters') return work.type === 'book_chapter' && work.status === 'published';
        if (category === 'accepted') return work.type === 'journal_article' && work.status === 'accepted';
        if (category === 'preprints') return work.type === 'preprint';
        return work.type === 'journal_article' && work.status === 'published';
    };

    const publicationCategoryKey = (category) => ({
        articles: 'filter-articles',
        chapters: 'filter-chapters',
        accepted: 'filter-accepted',
        preprints: 'filter-preprints'
    }[category] || 'filter-articles');

    const publicationTypeKey = (work) => {
        if (work.type === 'book_chapter') return 'pub-type-chapter';
        if (work.type === 'preprint') return 'pub-type-preprint';
        if (work.status === 'accepted') return 'pub-type-accepted';
        return 'pub-type-article';
    };

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    function getPublicationBaseList() {
        if (!isPublicationsPage) return allArticles;
        return allWorks.filter(work => publicationCategoryMatches(work, activePublicationCategory));
    }

    function getFilteredPublicationList() {
        const term = normalizeTitle(UI.pubSearchInput?.value || '');
        let list = getPublicationBaseList();

        if (activeYearFilter) {
            list = list.filter(work => work.year == activeYearFilter);
        }

        if (term) {
            list = list.filter(work => {
                const haystack = [
                    work.title,
                    work.year,
                    work.journalTitle,
                    work.publisher,
                    work.isbn,
                    ...(work.authors || [])
                ].map(normalizeTitle).join(' ');

                return haystack.includes(term);
            });
        }

        return list;
    }

    function updateCategoryFilterUI() {
        if (!UI.pubTypeButtons.length) return;
        const t = window.translations?.[window.currentLang] || {};

        UI.pubTypeButtons.forEach(button => {
            const category = button.dataset.publicationFilter;
            const count = allWorks.filter(work => publicationCategoryMatches(work, category)).length;
            const label = t[publicationCategoryKey(category)] || button.textContent || category;
            const isActive = category === activePublicationCategory;

            button.textContent = `${label} (${count})`;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    function renderPublications() {
        const grid = UI.pubsGrid;
        if (!grid) return;

        const t = window.translations?.[window.currentLang] || {};
        const list = getFilteredPublicationList();
        const visible = list.slice(0, showingPubsCount);

        updateCategoryFilterUI();
        grid.innerHTML = '';

        if (!visible.length) {
            grid.innerHTML = `<div class="card" style="grid-column:1/-1;text-align:center;padding:2rem;"><p>${escapeHtml(t.no_pubs_found || 'Nada encontrado.')}</p></div>`;
        } else {
            visible.forEach(work => {
                const typeLabel = t[publicationTypeKey(work)] || 'Publicação';
                const typeBadge = isPublicationsPage
                    ? `<span class="publication-type-badge">${escapeHtml(typeLabel)}</span>`
                    : '';

                const authors = isPublicationsPage && work.authors?.length
                    ? `<div class="publication-authors">${escapeHtml(work.authors.join('; '))}</div>`
                    : '';

                const metaParts = [work.year, work.journalTitle].filter(Boolean);
                const meta = `<div class="publication-meta">${metaParts.map((part, index) => index === 1 ? `<em>${escapeHtml(part)}</em>` : escapeHtml(part)).join(' • ')}</div>`;

                const extraParts = [];
                if (work.status === 'accepted') extraParts.push(t['pub-accepted-status'] || 'Aceito para publicação');
                if (work.type === 'book_chapter' && work.publisher) extraParts.push(work.publisher);
                if (work.type === 'book_chapter' && work.pages) extraParts.push(`${t['pub-pages'] || 'p.'} ${work.pages}`);
                if (work.isbn) extraParts.push(`${t['pub-isbn'] || 'ISBN'}: ${work.isbn}`);
                const extraMeta = extraParts.length
                    ? `<div class="publication-extra-meta">${escapeHtml(extraParts.join(' • '))}</div>`
                    : '';

                const link = work.doiLink || work.link;
                const doi = work.doi
                    ? `<div class="publication-doi"><a href="${escapeHtml(link)}" target="_blank" rel="noopener"><img src="https://upload.wikimedia.org/wikipedia/commons/1/11/DOI_logo.svg" alt="DOI" style="height:14px;margin-right:5px">${escapeHtml(work.doi)}</a></div>`
                    : '';

                const canShowCitation = (work.type === 'journal_article' && work.status === 'published') || work.type === 'preprint';
                const citation = canShowCitation
                    ? `<div class="citations">${work.cited_by.value
                        ? `${escapeHtml(t['pub-cited-by'] || 'Citado')} ${work.cited_by.value}x`
                        : escapeHtml(t['pub-no-citation'] || 'Sem dados de citação')}</div>`
                    : '';

                const readLink = link
                    ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener" class="article-link" style="margin-top:auto;padding-top:10px;display:inline-block;">${escapeHtml(t['pub-read'] || 'Ver publicação')} &rarr;</a>`
                    : '';

                grid.innerHTML += `<div class="card publication-card">${typeBadge}<h3>${escapeHtml(work.title)}</h3>${authors}${meta}${extraMeta}${doi}${citation}${readLink}</div>`;
            });
        }

        if (UI.pubsShownCount) {
            const template = t.showing_pubs_template || '{shown} / {total}';
            UI.pubsShownCount.textContent = template
                .replace('{shown}', visible.length)
                .replace('{total}', list.length);
        }

        if (UI.pubsLoadMoreBtn) {
            UI.pubsLoadMoreBtn.style.display = (visible.length >= list.length) ? 'none' : 'inline-block';
        }
    }

    function generateBibTeX() {
        const list = getFilteredPublicationList();
        if (list.length === 0) {
            alert(window.translations?.[window.currentLang]?.no_pubs_found || 'Nenhuma publicação para exportar.');
            return;
        }

        let bibContent = '';
        list.forEach(work => {
            const key = work.id
                ? work.id.replace(/[^a-zA-Z0-9]+/g, '_')
                : `${work.title.split(' ')[0].replace(/[^a-zA-Z]/g, '')}${work.year || '0000'}`;

            const entryType = work.type === 'book_chapter'
                ? 'incollection'
                : (work.type === 'preprint' ? 'misc' : 'article');

            const fields = [];
            fields.push(`  title = {${work.title}}`);
            if (work.authors?.length) fields.push(`  author = {${work.authors.join(' and ')}}`);

            if (work.type === 'book_chapter') {
                if (work.journalTitle) fields.push(`  booktitle = {${work.journalTitle}}`);
                if (work.publisher) fields.push(`  publisher = {${work.publisher}}`);
                if (work.pages) {
                    const bibPages = work.pages.replace(/\s*[-–—]\s*/g, '--');
                    fields.push(`  pages = {${bibPages}}`);
                }
                if (work.isbn) fields.push(`  isbn = {${work.isbn}}`);
            } else if (work.type === 'preprint') {
                if (work.journalTitle) fields.push(`  howpublished = {${work.journalTitle}}`);
            } else if (work.journalTitle) {
                fields.push(`  journal = {${work.journalTitle}}`);
            }

            if (work.year) fields.push(`  year = {${work.year}}`);
            if (work.doi) fields.push(`  doi = {${work.doi}}`);
            if (work.link) fields.push(`  url = {${work.link}}`);
            if (work.status === 'accepted') fields.push('  note = {Accepted for publication}');
            if (work.type === 'preprint') fields.push('  note = {Preprint}');

            bibContent += `@${entryType}{${key},\n${fields.join(',\n')}\n}\n\n`;
        });

        const blob = new Blob([bibContent], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'publicacoes.bib';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    function updateFilterUI() {
        const div = document.querySelector('#publicacoes .controls');
        let chip = document.getElementById('year-filter-chip');
        if (activeYearFilter) {
            if(!chip) { chip = document.createElement('div'); chip.id='year-filter-chip'; chip.style.cssText="background:var(--primary);color:#fff;padding:5px 12px;border-radius:15px;margin-top:10px;cursor:pointer;display:inline-block;"; div.appendChild(chip); }
            chip.innerHTML = `Filtro: ${activeYearFilter} &times;`;
            chip.onclick = () => { activeYearFilter = null; renderPublications(); updateFilterUI(); };
        } else if(chip) chip.remove();
    }

    // --- INIT ---
    async function init() {
        await Promise.all([
            ensureTranslationsLoaded(),
            ensureAcademicRegistryLoaded()
        ]);
        UI.track = document.querySelector('.carousel-track');
        UI.slides = Array.from(document.querySelectorAll('.carousel-slide'));
        UI.nextBtn = document.querySelector('.next-btn');
        UI.prevBtn = document.querySelector('.prev-btn');
        UI.dots = Array.from(document.querySelectorAll('.carousel-indicator'));
        UI.dashboardSection = document.getElementById('dashboard-academico') || document.getElementById('publicacoes');
        
        UI.pubsGrid = document.getElementById("publicacoes-grid");
        UI.pubSearchInput = document.getElementById('publication-search');
        UI.pubClearBtn = document.getElementById('publication-clear-btn');
        UI.pubTypeButtons = Array.from(document.querySelectorAll('[data-publication-filter]'));
        UI.pubsShownCount = document.getElementById('pubs-shown-count');
        UI.pubsLoadMoreBtn = document.getElementById('pubs-toggle-more');
        UI.exportBtn = document.getElementById('export-bibtex-btn');

        dashboardData.scholar = processPlatformData('scholar', 'google_scholar');
        dashboardData.scopus = processPlatformData('scopus', 'scopus');
        dashboardData.wos = processPlatformData('wos', 'web_of_science');
        dashboardData.max = processPlatformData('max', 'maximized');

        const fb = window.fallbackData;
        const acad = fb ? (fb.academicData || fb) : {};
        const scholarArticles = acad.google_scholar?.articles || [];
        const registryWorks = window.academicRegistry?.works;

        if (Array.isArray(registryWorks)) {
            allWorks = registryWorks
                .map(work => normalizeArticle(work, scholarArticles))
                .sort((a, b) => {
                    const yearDiff = (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0);
                    if (yearDiff !== 0) return yearDiff;

                    const posA = a.lattesPosition ?? Number.MAX_SAFE_INTEGER;
                    const posB = b.lattesPosition ?? Number.MAX_SAFE_INTEGER;
                    return posA - posB;
                });

            allArticles = allWorks
                .filter(work =>
                    work.type === 'journal_article' && work.status === 'published'
                )
                .sort((a, b) => {
                    const citationDiff = (b.cited_by?.value || 0) - (a.cited_by?.value || 0);
                    if (citationDiff !== 0) return citationDiff;

                    const yearDiff = (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0);
                    if (yearDiff !== 0) return yearDiff;

                    const posA = a.lattesPosition ?? Number.MAX_SAFE_INTEGER;
                    const posB = b.lattesPosition ?? Number.MAX_SAFE_INTEGER;
                    return posA - posB;
                });
        } else {
            const raw = acad.maximized?.articles || scholarArticles;
            allArticles = raw
                .map(article => normalizeArticle(article))
                .sort((a, b) => b.cited_by.value - a.cited_by.value);
            allWorks = [...allArticles];
        }

        isPublicationsPage = window.location.pathname.includes('publicacoes');
        showingPubsCount = isPublicationsPage ? allWorks.length : initialPubsToShow;
        
        platformOrder.forEach(p => renderPlatform(p, false));
        renderPublications();
        initCarouselLogic();

        if (UI.dashboardSection) {
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && !hasViewedSection) {
                    hasViewedSection = true;
                    const cur = platformOrder[currentSlideIndex];
                    if(cur) renderPlatform(cur, true);
                    observer.disconnect();
                }
            }, { threshold: 0.1, rootMargin: "0px" });
            observer.observe(UI.dashboardSection);
        } else {
            hasViewedSection = true; updateAllTexts();
        }

        if(UI.pubSearchInput) {
            UI.pubSearchInput.addEventListener('input', () => {
                showingPubsCount = isPublicationsPage ? allWorks.length : initialPubsToShow;
                renderPublications();
            });
        }

        if(UI.pubClearBtn) {
            UI.pubClearBtn.addEventListener('click', () => {
                UI.pubSearchInput.value = '';
                showingPubsCount = isPublicationsPage ? allWorks.length : initialPubsToShow;
                renderPublications();
            });
        }

        UI.pubTypeButtons.forEach(button => {
            button.addEventListener('click', () => {
                activePublicationCategory = button.dataset.publicationFilter || 'articles';
                activeYearFilter = null;
                showingPubsCount = allWorks.length;
                renderPublications();
                updateFilterUI();
            });
        });

        if(UI.pubsLoadMoreBtn) UI.pubsLoadMoreBtn.addEventListener('click', () => { showingPubsCount += pubsPerLoad; renderPublications(); });
        if(UI.exportBtn) UI.exportBtn.addEventListener('click', generateBibTeX);
        if (window.AppEvents) window.AppEvents.on('languageChanged', updateAllTexts);

        // --- CORREÇÃO DE RESIZE GLOBAL ---
        // Garante que o gráfico se ajuste se o usuário girar a tela ou redimensionar a janela
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (!window.Plotly?.Plots?.resize) return;
                platformOrder.forEach(p => {
                    const chartDiv = document.getElementById(`${p}-chart`);
                    if (chartDiv) window.Plotly.Plots.resize(chartDiv);
                });
            }, 200);
        });
    }
    return {
        init,
        allArticles: () => [...allArticles]
    };
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
        const profile = SiteProfile.get();
        const person = profile?.person || {};
        const linkedinUrl = profile?.profiles?.linkedin?.url || '';
        const linkedinLabel = linkedinUrl
            .replace(/^https?:\/\/(?:www\.)?/, '')
            .replace(/\/$/, '');
        const location = person.location || {};
        const profileLocation = [location.city, location.region, location.country_code]
            .filter(Boolean)
            .join(' - ');
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

            // O idioma atual já foi resolvido no início de generateCvPdf().

            doc.setFontSize(20).setFont('helvetica', 'bold').setTextColor(0).text(person.name || document.getElementById('hero-name')?.textContent || '', headerX, y + 15, { maxWidth: headerW });
            
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
            if (person.email) {
                doc.text(`Email: ${person.email}`, headerX, y + 70);
            }

            if (linkedinLabel) {
                doc.text(`LinkedIn: ${linkedinLabel}`, headerX, y + 82);
                doc.setTextColor(40, 40, 255);
                try {
                    doc.textWithLink(linkedinLabel, headerX + doc.getTextWidth('LinkedIn: '), y + 82, { url: linkedinUrl });
                } catch (e) { console.warn("jsPDF textWithLink pode não ser suportado."); }
                doc.setTextColor(80);
            }

            // Correção do "Location" (como feito anteriormente)
            const locationLabel = (lang === 'pt') ? 'Localização:' : 'Location:';
            doc.text(`${locationLabel} ${langContent['pdf-location'] || profileLocation}`, headerX, y + 94); 

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

            const organizations = profile?.organizations || {};
            const educationById = new Map(
                (profile?.education || []).map(item => [item.id, item])
            );
            const affiliationsById = new Map(
                (profile?.affiliations || []).map(item => [item.id, item])
            );

            const requireAcademicFact = (collection, id) => {
                const source = collection === 'education' ? educationById : affiliationsById;
                const item = source.get(id);
                if (!item) {
                    throw new Error(`Fato acadêmico canônico ausente: ${collection}:${id}`);
                }
                return item;
            };

            const formatAcademicPeriod = (item) => {
                const startYear = item.start_year;
                const endYear = item.end_year;
                if (item.current) {
                    const present = langContent['edu-period-present'] || (lang === 'pt' ? 'Presente' : 'Present');
                    return `${startYear} - ${present}`;
                }
                if (startYear === endYear) return String(startYear);
                return `${startYear} - ${endYear}`;
            };

            const formatInstitution = (item) => {
                const organization = organizations[item.organization_id];
                if (!organization?.name) {
                    throw new Error(`Organização canônica ausente: ${item.organization_id}`);
                }
                const funders = (item.funder_ids || []).map(funderId => {
                    const funder = organizations[funderId];
                    if (!funder?.short_name) {
                        throw new Error(`Financiador canônico ausente: ${funderId}`);
                    }
                    return funder.short_name;
                });
                return funders.length
                    ? `${organization.name} — ${funders.join(' / ')}`
                    : organization.name;
            };

            const formatMentorName = (mentor) => {
                if (!mentor) return '';
                const prefixKey = mentor.title_code === 'researcher'
                    ? 'edu-mentor-title-researcher'
                    : 'edu-mentor-title-professor';
                const prefix = langContent[prefixKey] || '';
                return `${prefix} ${mentor.name}`.trim();
            };

            const formatAcademicMentors = (item) => {
                const parts = [];
                if (item.advisor) {
                    const label = langContent['edu-advisor-label'] || (lang === 'pt' ? 'Orientador:' : 'Advisor:');
                    parts.push(`${label} ${formatMentorName(item.advisor)}.`);
                }
                if (item.coadvisors?.length) {
                    const label = langContent['edu-coadvisor-label'] || (lang === 'pt' ? 'Coorientador:' : 'Co-advisor:');
                    const names = item.coadvisors.map(formatMentorName).join(', ');
                    parts.push(`${label} ${names}.`);
                }
                return parts.join(' ');
            };

            const educationData = [
                {
                    type: 'entry',
                    fact: requireAcademicFact('education', 'phd-applied-statistics-biometrics'),
                    title: 'edu-title1',
                    details: 'edu-desc1'
                },
                {
                    type: 'group',
                    group_title: 'cv-edu-postdocs-title',
                    items: [
                        {
                            fact: requireAcademicFact('affiliations', 'postdoc-ufv-cnpq-2025'),
                            details: 'edu-desc-postdoc-cnpq-2025'
                        },
                        {
                            fact: requireAcademicFact('affiliations', 'postdoc-ufv-fapemig-2023-2025'),
                            details: 'edu-desc2'
                        },
                        {
                            fact: requireAcademicFact('affiliations', 'postdoc-ufv-cnpq-2022-2023'),
                            details: 'edu-desc3'
                        },
                        {
                            fact: requireAcademicFact('affiliations', 'postdoc-embrapa-cnpq-2022'),
                            details: 'edu-desc4'
                        }
                    ]
                },
                {
                    type: 'entry',
                    fact: requireAcademicFact('education', 'phd-genetics-breeding'),
                    title: 'edu-title5',
                    details: 'edu-desc5'
                },
                {
                    type: 'entry',
                    fact: requireAcademicFact('education', 'msc-genetics-breeding'),
                    title: 'edu-title6',
                    details: 'edu-desc6'
                },
                {
                    type: 'entry',
                    fact: requireAcademicFact('education', 'bsc-agronomy'),
                    title: 'edu-title7',
                    details: 'edu-desc7'
                }
            ];

            const professionalCvSkipIds = new Set([
                'msc-genetics-breeding',
                'bsc-agronomy'
            ]);

            educationData.forEach(item => {
                if (
                    cvType === 'pro'
                    && item.type === 'entry'
                    && professionalCvSkipIds.has(item.fact.id)
                ) {
                    return;
                }

                checkPageBreak(60);

                if (item.type === 'group') {
                    const groupTitle = langContent[item.group_title] || 'Pós-Doutorados';
                    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(40).text(groupTitle, margin, y);
                    y += 12;

                    item.items.forEach(subItem => {
                        checkPageBreak(60);

                        const date = formatAcademicPeriod(subItem.fact);
                        const institution = formatInstitution(subItem.fact);
                        const advisorText = formatAcademicMentors(subItem.fact);
                        const details = langContent[subItem.details] || '';

                        doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(80).text(institution, margin, y);
                        doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(100).text(date, page_width - margin, y, { align: 'right' });
                        y += 12;

                        if (advisorText) {
                            const advisorLines = doc.splitTextToSize(advisorText, max_width);
                            doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(100);
                            doc.text(advisorLines, margin, y);
                            y += advisorLines.length * 10 + 3;
                        }

                        if (details) {
                            addJustifiedText(details, { fontSize: 8, width: max_width });
                        }
                        y += item_gap;
                    });
                } else {
                    const title = langContent[item.title] || 'Title';
                    const date = formatAcademicPeriod(item.fact);
                    const institution = formatInstitution(item.fact);
                    const advisorText = formatAcademicMentors(item.fact);
                    const details = langContent[item.details] || '';

                    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(40).text(title, margin, y);
                    doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(100).text(date, page_width - margin, y, { align: 'right' });
                    y += 12;

                    doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(80).text(institution, margin, y);
                    y += 12;

                    if (advisorText) {
                        const advisorLines = doc.splitTextToSize(advisorText, max_width);
                        doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(100);
                        doc.text(advisorLines, margin, y);
                        y += advisorLines.length * 10 + 3;
                    }

                    if (
                        details
                        && (
                            cvType !== 'pro'
                            || !professionalCvSkipIds.has(item.fact.id)
                        )
                    ) {
                        addJustifiedText(details, { fontSize: 8, width: max_width });
                    }

                    y += item_gap;
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
            const profileFileStem = (person.name || 'CV')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^A-Za-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '');
            const fileName = langContent[fileNameKey] || `CV-${profileFileStem}_${cvType}_${lang}.pdf`; 

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
        const emailToCopy = SiteProfile.get()?.person?.email;
        if (!emailToCopy) {
            console.error('ClipboardCopier: e-mail canônico indisponível.');
            return;
        }

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
     * Traduções são globais; dados de fallback só são carregados em páginas que os consomem.
     */
    init() {
        console.log("LanguageManager.init: Iniciando carregamento de dados da página...");

        // Expõe o listener do emitter imediatamente
        window.AppEvents = { on: this.emitter.on.bind(this.emitter) };

        const needsFallbackData = !!(
            document.getElementById('projects-list') ||
            document.getElementById('publicacoes-grid') ||
            document.querySelector('[data-cv-type]') ||
            document.querySelector('[id$="-chart"]')
        );

        const translationsRequest = fetch('translations.json').then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status} ao buscar translations.json`);
            return response.json();
        });

        const fallbackRequest = needsFallbackData
            ? fetch('fallback-data.json')
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status} ao buscar fallback-data.json`);
                    return response.json();
                })
                .catch(error => {
                    console.warn("fallback-data.json indisponível; módulos dependentes continuarão em modo degradado.", error);
                    return null;
                })
            : Promise.resolve(null);

        Promise.all([translationsRequest, fallbackRequest])
        .then(([translationsData, fallbackData]) => {
            console.log(`LanguageManager.init: traduções carregadas; fallback ${needsFallbackData ? (fallbackData ? 'carregado' : 'indisponível') : 'não necessário'}.`);
            window.translations = translationsData;
            window.fallbackData = fallbackData;

            // 1. Define o idioma inicial (dispara evento 'languageChanged')
            this.setLanguage(this.currentLang);

            // 2. Inicializa apenas os componentes pertinentes à página atual
            initializePageComponents();
        })
        .catch(error => {
            console.error("FALHA CRÍTICA AO CARREGAR translations.json:", error);
            document.body.innerHTML = '<div style="color:red; padding: 20px;">Erro crítico: Não foi possível carregar as traduções essenciais. Verifique o console.</div>';
        });
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
        timeline: null
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
    }
};

// =================================================================================
// Inicialização Centralizada dos Módulos
// --- ALTERAÇÃO: Simplificada, chamada após carregamento dos JSONs ---
// =================================================================================
function initializePageComponents() {
    console.log("initializePageComponents: Iniciando módulos pertinentes à página...");
    ParticleBackground.init();
    MobileNavHandler.init();
    PageSetup.init();
    ClipboardCopier.init();
    ContactForm.init();
    App.init();

    if (document.querySelector('[data-cv-type]')) {
        CvPdfGenerator.init();
    }

    const hasAcademicUi = !!(
        document.getElementById('publicacoes-grid') ||
        document.querySelector('[id$="-chart"]')
    );
    if (hasAcademicUi) {
        scholarScript.init();
    }

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
    console.log("initializePageComponents: Módulos inicializados.");
}

// =================================================================================
// PONTO DE ENTRADA PRINCIPAL
// --- ALTERAÇÃO: Apenas chama LanguageManager.init que agora orquestra tudo ---
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded: Evento disparado. Iniciando LanguageManager...");
    LanguageManager.init(); // LanguageManager agora carrega JSONs e chama initializePageComponents
});