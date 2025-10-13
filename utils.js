/**
 * @file utils.js
 * @description Contém scripts utilitários, incluindo fundo de partículas, validação de formulário e busca de repositórios do GitHub.
 * @author Weverton C.
 * @version 5.0.0
 */

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
// =================================================================================
const GithubReposModule = {
    // --- Configurações e Estado ---
    GITHUB_USER: 'WevertonGomesCosta',
    CACHE_VERSION: 'v13',
    GITHUB_PROXY_URL: 'https://corsproxy.io/?',
    state: { allRepos: [], filteredRepos: [], showingCount: 0, currentFilter: '', isFetching: false, lang: 'pt', translations: {} },
    config: {},

    // --- Funções Utilitárias ---
    getFallbackRepos: () => [
        { "name": "Genomic-Selection-for-Drought-Tolerance-Using-Genome-Wide-SNPs-in-Casava", "html_url": "https://github.com/WevertonGomesCosta/Genomic-Selection-for-Drought-Tolerance-Using-Genome-Wide-SNPs-in-Casava", "description": "This website is a project for analysis of the Genomic Selection for Drought Tolerance Using Genome Wide GBS and/or DART in Cassava by EMBRAPA Mandioca.", "language": "R", "stargazers_count": 2, "forks_count": 0, "updated_at": "2022-10-20T17:47:16Z", "topics": ["cassava", "eda", "gblup", "genomic-selection", "mixed-models", "multi-environment", "rr-blup", "single-environment"] },
        { "name": "Bovine-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow", "html_url": "https://github.com/WevertonGomesCosta/Bovine-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow", "description": "Mask R-CNN for object detection and instance segmentation on Keras and TensorFlow", "language": "Python", "stargazers_count": 1, "forks_count": 1, "updated_at": "2022-12-01T14:00:58Z", "topics": [] },
        { "name": "Integrating-nir-genomic-kernel", "html_url": "https://github.com/WevertonGomesCosta/Integrating-nir-genomic-kernel", "description": "Demonstrar que a fusão de dados espectrais e genômicos pode aumentar significativamente a acurácia da predição fenotípica, contribuindo para decisões mais eficientes em programas de seleção", "language": "R", "stargazers_count": 0, "forks_count": 0, "updated_at": "2025-08-29T17:16:37Z", "topics": [] },
        { "name": "Machine-learning-e-redes-neurais-artificiais-no-melhoramento-genetico-do-cafeeiro", "html_url": "https://github.com/WevertonGomesCosta/Machine-learning-e-redes-neurais-artificiais-no-melhoramento-genetico-do-cafeeiro", "description": "Este repositório desenvolve e compara métodos de machine learning e redes neurais artificiais para aprimorar a seleção genômica ampla (GWS) em Coffea arabica e identificar marcadores SNP informativos.", "language": "R", "stargazers_count": 0, "forks_count": 0, "updated_at": "2025-07-09T11:55:40Z", "topics": ["breeding", "coffee", "genetics", "machine-learning", "neural-network"] }
    ],
    titleCase: (str) => !str ? '' : str.replace(/[-_]/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()),
    debounce: (fn, wait = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), wait); }; },

    // --- Lógica de Cache ---
    readCache() {
        try {
            const CACHE_KEY = `gh_repos_cache_${this.CACHE_VERSION}`;
            const CACHE_TS_KEY = `gh_repos_cache_ts_${this.CACHE_VERSION}`;
            const CACHE_TTL = 1000 * 60 * 60 * 24;
            const ts = Number(localStorage.getItem(CACHE_TS_KEY) || 0);
            if (Date.now() - ts < CACHE_TTL) return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        } catch (e) { console.warn('Falha ao ler cache de repositórios:', e); }
        return null;
    },
    writeCache(data) {
        try {
            const CACHE_KEY = `gh_repos_cache_${this.CACHE_VERSION}`;
            const CACHE_TS_KEY = `gh_repos_cache_ts_${this.CACHE_VERSION}`;
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
        } catch (e) { console.warn('Falha ao escrever no cache de repositórios:', e); }
    },

    // --- Lógica da API ---
    async fetchAllPages(url) {
        let results = [], nextUrl = url;
        while (nextUrl) {
            const response = await fetch(`${this.GITHUB_PROXY_URL}${encodeURIComponent(nextUrl)}`);
            if (!response.ok) throw new Error(`API do GitHub falhou: ${response.status}`);
            const data = await response.json();
            results = results.concat(data);
            const linkHeader = response.headers.get('Link');
            nextUrl = null;
            if (linkHeader) {
                const nextLink = linkHeader.split(',').find(s => s.includes('rel="next"'));
                if (nextLink) {
                    const match = nextLink.match(/<([^>]+)>/);
                    if (match) nextUrl = match[1];
                }
            }
        }
        return results;
    },
    async fetchRepos() {
        if (this.state.isFetching) return;
        this.state.isFetching = true;
        this.updateMetaTextSafely('fetching_repos', 'Buscando repositórios...');

        const cachedRepos = this.readCache();
        if (cachedRepos && cachedRepos.length > 0) {
            this.state.allRepos = cachedRepos;
            this.updateMetaTextSafely('loaded_repos_cache', `Carregado ${cachedRepos.length} repositórios do cache.`, cachedRepos.length);
            this.state.isFetching = false;
            this.filterAndRender();
            return;
        }

        try {
            const url = `https://api.github.com/users/${this.GITHUB_USER}/repos?per_page=100`;
            const data = await this.fetchAllPages(url);
            this.state.allRepos = data.map(r => ({ name: r.name, html_url: r.html_url, description: r.description || '', language: r.language || '', stargazers_count: r.stargazers_count || 0, forks_count: r.forks_count || 0, updated_at: r.updated_at, topics: r.topics || [], has_pages: r.has_pages, homepage: r.homepage }));
            this.writeCache(this.state.allRepos);
            this.updateMetaTextSafely('found_repos', `Encontrado ${this.state.allRepos.length} repositórios.`, this.state.allRepos.length);
        } catch (err) {
            console.error("Falha ao buscar repositórios do GitHub:", err);
            this.updateMetaTextSafely('fetch_error', 'Erro ao buscar. Usando dados de fallback.');
            this.state.allRepos = this.getFallbackRepos();
        } finally {
            this.state.isFetching = false;
            this.filterAndRender();
        }
    },

    // --- Renderização ---
    createCard(repo) {
        const card = document.createElement('div');
        card.className = 'project-card card';
        card.setAttribute('role', 'listitem');
        const { lang, translations } = this.state;
        const trans = translations[lang] || {};
        const siteUrl = repo.homepage || (repo.has_pages ? `https://${this.GITHUB_USER}.github.io/${repo.name}/` : null);

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

        if (reposToDisplay.length === 0 && !this.state.isFetching) {
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

    // --- Inicialização ---
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

        if (this.config.searchEl) this.config.searchEl.addEventListener('input', this.debounce(e => { this.state.currentFilter = e.target.value; this.filterAndRender(); }));
        if (this.config.clearBtnEl) this.config.clearBtnEl.addEventListener('click', () => { if (this.config.searchEl) this.config.searchEl.value = ''; this.state.currentFilter = ''; this.filterAndRender(); if (this.config.searchEl) this.config.searchEl.focus(); });
        if (this.config.loadMoreBtnEl && this.config.isPaginated) this.config.loadMoreBtnEl.addEventListener('click', () => { this.state.showingCount = Math.min(this.state.showingCount + this.config.incrementCount, this.state.filteredRepos.length); this.render(); });
        
        // Expor a função de re-renderização para o escopo global
        window.githubScript_proj = { renderAll: this.reRenderWithCurrentLang.bind(this) };

        this.fetchRepos();
    }
};

// =================================================================================
// Inicializador Global
// =================================================================================
document.addEventListener("DOMContentLoaded", () => {
    ParticleBackground.init();
    ContactForm.init();

    // Inicializa o módulo do GitHub com configurações diferentes dependendo da página
    if (document.getElementById('projects-list')) {
        if (document.getElementById('toggle-more')) {
            // Página Principal
            GithubReposModule.init({
                listSelector: '#projects-list', metaSelector: '#projects-meta', searchSelector: '#project-search',
                clearBtnSelector: '#clear-btn', loadMoreBtnSelector: '#toggle-more', shownCountSelector: '#shown-count',
                isPaginated: true, initialCount: 3, incrementCount: 3
            });
        } else {
            // Página de Projetos
            GithubReposModule.init({
                listSelector: '#projects-list', metaSelector: '#projects-meta', searchSelector: '#project-search',
                clearBtnSelector: '#clear-btn', isPaginated: false
            });
        }
    }
});

