/**
 * Script para buscar, exibir e filtrar repositórios do GitHub de um usuário específico.
 * Combina busca da API, cache em localStorage, e renderização dinâmica no DOM.
 */
window.githubScript = (function() {
    'use strict';

    // --- 1. Configuração e Constantes ---
    const GITHUB_USER = 'WevertonGomesCosta';
    const GITHUB_API_URL = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100`;
    const GITHUB_PROXY_URL = 'https://corsproxy.io/?';
    const CACHE_KEY = 'gh_repos_cache_v10'; // Versão do cache
    const CACHE_TS_KEY = 'gh_repos_cache_ts_v10'; // Timestamp do cache
    const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 horas em milissegundos
    const REPOS_PER_PAGE = 3;

    // --- 2. Seletores do DOM ---
    const listEl = document.getElementById('projects-list');
    const metaEl = document.getElementById('projects-meta');
    const searchEl = document.getElementById('project-search');
    const toggleBtn = document.getElementById('toggle-more');
    const shownCountEl = document.getElementById('shown-count');
    const clearBtn = document.getElementById('clear-btn');

    // --- 3. Estado da Aplicação ---
    let allRepos = [];
    let showingCount = REPOS_PER_PAGE;
    let currentFilter = '';

    // --- 4. Funções Principais (API, Cache, Renderização) ---

    /**
     * Lê os repositórios do cache se ainda forem válidos.
     * @returns {Array|null} Array de repositórios ou nulo se o cache for inválido.
     */
    function readCache() {
        try {
            const cachedTimestamp = Number(localStorage.getItem(CACHE_TS_KEY) || 0);
            if (Date.now() - cachedTimestamp < CACHE_TTL) {
                return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
            }
        } catch (e) {
            console.warn('Falha ao ler o cache de repositórios.', e);
        }
        return null;
    }

    /**
     * Escreve os dados dos repositórios no localStorage.
     * @param {Array} data - O array de repositórios para salvar.
     */
    function writeCache(data) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
        } catch (e) {
            console.warn('Falha ao escrever no cache de repositórios.', e);
        }
    }

    /**
     * Busca todas as páginas de resultados da API do GitHub.
     * @param {string} url - A URL inicial da API.
     * @returns {Promise<Array>} Uma promessa que resolve para um array com todos os repositórios.
     */
    async function fetchAllPages(url) {
        let results = [];
        let nextUrl = url;
        while (nextUrl) {
            const response = await fetch(`${GITHUB_PROXY_URL}${encodeURIComponent(nextUrl)}`);
            if (!response.ok) {
                throw new Error(`Falha na requisição à API do GitHub: ${response.status}`);
            }
            const data = await response.json();
            results = results.concat(data);

            const linkHeader = response.headers.get('Link');
            nextUrl = null;
            if (linkHeader) {
                const nextLink = linkHeader.split(',').find(s => s.includes('rel="next"'));
                if (nextLink) {
                    const match = nextLink.match(/<([^>]+)>/);
                    if (match) {
                        nextUrl = match[1];
                    }
                }
            }
        }
        return results;
    }

    /**
     * Orquestra a busca de repositórios, usando cache ou buscando da API.
     */
    async function fetchRepos() {
        metaEl.textContent = 'Buscando repositórios...';
        const cachedRepos = readCache();

        if (cachedRepos && cachedRepos.length > 0) {
            allRepos = cachedRepos;
            metaEl.textContent = `Exibindo ${allRepos.length} repositórios (do cache).`;
            render();
            return;
        }

        try {
            const data = await fetchAllPages(GITHUB_API_URL);
            allRepos = data.map(repo => ({
                name: repo.name,
                html_url: repo.html_url,
                description: repo.description || '',
                language: repo.language || '',
                stargazers_count: repo.stargazers_count || 0,
                forks_count: repo.forks_count || 0,
                updated_at: repo.updated_at,
                topics: repo.topics || [],
                has_pages: repo.has_pages,
                homepage: repo.homepage
            }));
            writeCache(allRepos);
            metaEl.textContent = `Encontrados ${allRepos.length} repositórios.`;
            render();
        } catch (err) {
            console.error("Falha ao buscar repositórios do GitHub:", err);
            metaEl.textContent = 'Erro ao buscar repositórios. Exibindo projetos principais.';
            // Fallback para uma lista pré-definida em caso de erro na API
            allRepos = getFallbackRepos();
            render();
        }
    }

    /**
     * Renderiza os cartões de projeto no DOM com base no estado atual.
     */
    function render() {
        listEl.innerHTML = '';
        const filter = currentFilter.trim().toLowerCase();

        const filtered = filter ?
            allRepos.filter(r =>
                r.name.toLowerCase().includes(filter) ||
                (r.description || '').toLowerCase().includes(filter) ||
                (r.language || '').toLowerCase().includes(filter) ||
                r.topics.some(t => t.toLowerCase().includes(filter))
            ) :
            allRepos;

        const sorted = sortRepos(filtered);
        const toShowCount = filter ? sorted.length : Math.min(showingCount, sorted.length);
        const reposToShow = sorted.slice(0, toShowCount);

        if (reposToShow.length === 0) {
            listEl.innerHTML = `<div class="project-card" style="grid-column: 1 / -1;"><p class="project-desc">Nenhum repositório encontrado com os critérios de busca.</p></div>`;
        } else {
            reposToShow.forEach(repo => {
                const cardElement = createCard(repo);
                listEl.appendChild(cardElement);
            });
        }

        // Atualiza a UI de controle
        shownCountEl.textContent = `${toShowCount} / ${sorted.length}`;
        toggleBtn.classList.toggle('hidden', filter || toShowCount >= sorted.length);
        toggleBtn.textContent = 'Mostrar mais';
    }

    /**
     * Cria um elemento de cartão HTML para um único repositório.
     * @param {object} repo - O objeto do repositório.
     * @returns {HTMLElement} O elemento do cartão.
     */
    function createCard(repo) {
        const card = document.createElement('div');
        card.className = 'project-card card';
        card.setAttribute('role', 'listitem');

        // Lógica para links: prioriza homepage, depois GitHub Pages, e por fim o repositório.
        const siteUrl = repo.homepage || (repo.has_pages ? `https://${GITHUB_USER}.github.io/${repo.name}/` : null);
        let actionsHtml = '';
        if (siteUrl) {
            actionsHtml = `
                <a class="link-btn" href="${siteUrl}" target="_blank" rel="noopener">Ver Site</a>
                <a class="link-btn secondary" href="${repo.html_url}" target="_blank" rel="noopener">Repositório</a>
            `;
        } else {
            actionsHtml = `<a class="link-btn" href="${repo.html_url}" target="_blank" rel="noopener">Repositório</a>`;
        }

        card.innerHTML = `
            <div class="project-top">
                <h3>${escapeHtml(titleCase(repo.name))}</h3>
                <div class="project-meta">
                    <span class="badge">⭐ ${repo.stargazers_count}</span>
                    <span class="badge">🍴 ${repo.forks_count}</span>
                </div>
            </div>
            <p class="project-desc">${escapeHtml(repo.description || 'Sem descrição.')}</p>
            <div class="project-topics"></div>
            <div class="project-meta" style="margin-top: auto;">
                <span class="badge">${escapeHtml(repo.language || '—')}</span>
                <span class="small-muted">Atualizado em ${new Date(repo.updated_at).toLocaleDateString()}</span>
            </div>
            <div class="actions">${actionsHtml}</div>
        `;

        const topicsContainer = card.querySelector('.project-topics');
        if (repo.topics && repo.topics.length > 0) {
            repo.topics.slice(0, 4).forEach(topic => {
                const tag = document.createElement('span');
                tag.className = 'topic-tag';
                tag.textContent = topic;
                topicsContainer.appendChild(tag);
            });
        }

        return card;
    }

    // --- 5. Funções Utilitárias ---

    /**
     * Ordena os repositórios por estrelas, forks e data de atualização.
     * @param {Array} arr - Array de repositórios para ordenar.
     * @returns {Array} O array ordenado.
     */
    const sortRepos = (arr) => [...arr].sort((a, b) =>
        b.stargazers_count - a.stargazers_count ||
        b.forks_count - a.forks_count ||
        new Date(b.updated_at) - new Date(a.updated_at)
    );

    /**
     * Converte uma string para Title Case, substituindo hífens e underscores.
     * @param {string} str - A string de entrada.
     * @returns {string} A string formatada.
     */
    const titleCase = (str) => (str || '').replace(/[-_]/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

    /**
     * Escapa caracteres HTML para prevenir XSS.
     * @param {string} s - A string de entrada.
     * @returns {string} A string segura.
     */
    const escapeHtml = (s) => (s || '').replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[m]);

    /**
     * Cria uma função debounced que atrasa a invocação.
     * @param {Function} func - A função a ser debounced.
     * @param {number} wait - O tempo de espera em milissegundos.
     * @returns {Function} A nova função debounced.
     */
    const debounce = (func, wait = 300) => {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };

    /**
     * Retorna uma lista de repositórios pré-definidos para fallback.
     * @returns {Array}
     */
    function getFallbackRepos() {
        return [
             { "name": "Genomic-Selection-for-Drought-Tolerance-Using-Genome-Wide-SNPs-in-Casava", "html_url": "https://github.com/WevertonGomesCosta/Genomic-Selection-for-Drought-Tolerance-Using-Genome-Wide-SNPs-in-Casava", "description": "This website is a project for analysis of the Genomic Selection for Drought Tolerance Using Genome Wide GBS and/or DART in Cassava by EMBRAPA Mandioca.", "language": "R", "stargazers_count": 2, "forks_count": 0, "updated_at": "2022-10-20T17:47:16Z", "topics": ["cassava", "eda", "gblup", "genomic-selection", "mixed-models", "multi-environment", "rr-blup", "single-environment"], "has_pages": true },
             { "name": "Bovine-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow", "html_url": "https://github.com/WevertonGomesCosta/Bovine-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow", "description": null, "language": "Python", "stargazers_count": 1, "forks_count": 1, "updated_at": "2022-12-01T14:00:58Z", "topics": [], "has_pages": false },
             { "name": "Integrating-nir-genomic-kernel", "html_url": "https://github.com/WevertonGomesCosta/Integrating-nir-genomic-kernel", "description": "Demonstrar que a fusão de dados espectrais e genômicos pode aumentar significativamente a acurácia da predição fenotípica, contribuindo para decisões mais eficientes em programas de seleção", "language": "R", "stargazers_count": 0, "forks_count": 0, "updated_at": "2025-08-29T17:16:37Z", "topics": [], "has_pages": false },
             { "name": "Machine-learning-e-redes-neurais-artificiais-no-melhoramento-genetico-do-cafeeiro", "html_url": "https://github.com/WevertonGomesCosta/Machine-learning-e-redes-neurais-artificiais-no-melhoramento-genetico-do-cafeeiro", "description": "Este repositório desenvolve e compara métodos de machine learning e redes neurais artificiais para aprimorar a seleção genômica ampla (GWS) em Coffea arabica e identificar marcadores SNP informativos. Utiliza dados reais de 195 genótipos (21 211 SNPs) com características de doença e produtividade.", "language": "R", "stargazers_count": 0, "forks_count": 0, "updated_at": "2025-07-09T11:55:40Z", "topics": ["breeding", "coffee", "genetics", "machine-learning", "neural-network"], "has_pages": true }
        ];
    }


    // --- 6. Event Listeners ---

    /**
     * Inicializa os event listeners da página.
     */
    function setupEventListeners() {
        searchEl.addEventListener('input', debounce(e => {
            currentFilter = e.target.value;
            render();
        }));

        clearBtn.addEventListener('click', () => {
            searchEl.value = '';
            currentFilter = '';
            showingCount = REPOS_PER_PAGE;
            render();
            searchEl.focus();
        });

        toggleBtn.addEventListener('click', () => {
            showingCount += REPOS_PER_PAGE;
            render();
        });
    }

    // --- 7. Inicialização ---

    /**
     * Função de inicialização do módulo.
     */
    function init() {
        if (!listEl || !metaEl || !searchEl || !toggleBtn || !shownCountEl || !clearBtn) {
            console.error("Um ou mais elementos do DOM necessários não foram encontrados. O script não será executado.");
            return;
        }
        setupEventListeners();
        fetchRepos();
    }

    init(); // Inicia o script

    // Expõe publicamente a função de renderização, caso seja necessário atualizá-la externamente
    return {
        renderAll: render
    };

})();

// Script para buscar repositórios do GitHub
window.githubScript_proj = (function() {
    const GITHUB_USER = 'WevertonGomesCosta'; const CACHE_KEY = 'gh_repos_cache_v9'; const CACHE_TS_KEY = 'gh_repos_cache_ts_v9'; const CACHE_TTL = 86400000; const GITHUB_PROXY_URL = 'https://corsproxy.io/?';
    let allRepos = []; let currentFilter = '';
    const listEl = document.getElementById('projects-list'); const metaEl = document.getElementById('projects-meta'); const searchEl = document.getElementById('project-search'); const clearBtn = document.getElementById('clear-btn');
    function readCache() { try { const ts = Number(localStorage.getItem(CACHE_TS_KEY) || 0); if (Date.now() - ts < CACHE_TTL) return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'); } catch (e) { console.warn('Falha ao ler cache', e); } return null; }
    function writeCache(data) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); localStorage.setItem(CACHE_TS_KEY, String(Date.now())); } catch (e) { console.warn('Falha ao escrever cache', e); } }
    async function fetchAllPages(url) { let r = [], n = url; while (n) { const t = await fetch(`${GITHUB_PROXY_URL}${encodeURIComponent(n)}`); if (!t.ok) throw new Error(`API do GitHub falhou: ${t.status}`); const a = await t.json(); r = r.concat(a); const e = t.headers.get("Link"); n = null; if (e) { const o = e.split(",").find(t => t.includes('rel="next"')); if (o) { const c = o.match(/<([^>]+)>/); if (c) n = c[1]; } } } return r; }
    async function fetchRepos() {
        metaEl.textContent = translations[currentLang].fetching_repos;
        const cache = readCache();
        if (cache && cache.length) { allRepos = cache; renderAll(); return; }
        try {
            const data = await fetchAllPages(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100`);
            allRepos = data.map(r => ({ name: r.name, html_url: r.html_url, description: r.description || '', language: r.language || '', stargazers_count: r.stargazers_count || 0, forks_count: r.forks_count || 0, updated_at: r.updated_at, topics: r.topics || [], has_pages: r.has_pages, homepage: r.homepage }));
            writeCache(allRepos);
            renderAll();
        } catch (err) { console.error("Falha ao buscar no GitHub:", err); metaEl.textContent = translations[currentLang].fetch_error; renderAll(); }
    }
    function sortRepos(arr) { return [...arr].sort((a, b) => b.stargazers_count - a.stargazers_count || b.forks_count - a.forks_count || new Date(b.updated_at) - new Date(a.updated_at)); }
    function createCard(repo) {
        const l = currentLang;
        const card = document.createElement('div');
        card.className = 'project-card';
        card.setAttribute('role', 'listitem');
        // Prioriza a URL da homepage do repositório, depois verifica o GitHub Pages
        const siteUrl = repo.homepage || (repo.has_pages ? `https://${GITHUB_USER}.github.io/${repo.name}/` : null);
        const liveSiteText = l === 'pt' ? 'Ver Site' : 'View Site';
        const repoText = l === 'pt' ? 'Repositório' : 'Repository';
        let actionsHtml = '';
        if (siteUrl) {
            actionsHtml += `<a class="link-btn" href="${siteUrl}" target="_blank" rel="noopener">${translations[l].live_site_btn || liveSiteText}</a>`;
            actionsHtml += `<a class="link-btn secondary" href="${repo.html_url}" target="_blank" rel="noopener">${translations[l].repo_btn || repoText}</a>`;
        } else {
            actionsHtml += `<a class="link-btn" href="${repo.html_url}" target="_blank" rel="noopener">${translations[l].repo_btn || repoText}</a>`;
        }
        card.innerHTML = `<div class="project-top"><h3>${escapeHtml(titleCase(repo.name))}</h3><div class="project-meta"><span>⭐ ${repo.stargazers_count}</span><span>🍴 ${repo.forks_count}</span></div></div><p class="project-desc">${escapeHtml(repo.description || translations[l].no_description)}</p><div class="project-topics"></div><div class="project-meta" style="margin-top: auto;"><span>${escapeHtml(repo.language || '—')}</span></div><div class="actions">${actionsHtml}</div>`;
        const topics = card.querySelector('.project-topics');
        if (topics && repo.topics?.length) repo.topics.slice(0, 4).forEach(t => { const tag = document.createElement('span'); tag.className = 'topic-tag'; tag.textContent = t; topics.appendChild(tag); });
        return card;
    }
    function render() { listEl.innerHTML = ''; const filter = currentFilter.trim().toLowerCase(); const filtered = filter ? allRepos.filter(r => r.name.toLowerCase().includes(filter) || (r.description || '').toLowerCase().includes(filter) || (r.language || '').toLowerCase().includes(filter) || r.topics.some(t => t.toLowerCase().includes(filter))) : allRepos; const sorted = sortRepos(filtered); if (sorted.length === 0 && allRepos.length > 0) { listEl.innerHTML = `<div class="project-card" style="grid-column: 1 / -1;"><p class="project-desc">${translations[currentLang].no_repos_found}</p></div>`; } else { sorted.forEach(repo => listEl.appendChild(createCard(repo))); } metaEl.textContent = translations[currentLang].showing_repos(sorted.length, allRepos.length); }
    function renderAll() { render(); metaEl.textContent = translations[currentLang].showing_repos(allRepos.length, allRepos.length); }
    function titleCase(str) { return (str || '').replace(/[-_]/g, ' ').replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase()); }
    function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, m => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[m]); }
    const debounce = (fn, wait = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), wait); }; };
    searchEl.addEventListener('input', debounce(e => { currentFilter = e.target.value; render(); }));
    clearBtn.addEventListener('click', () => { searchEl.value = ''; currentFilter = ''; render(); searchEl.focus(); });
    fetchRepos();
    return { renderAll };
})();