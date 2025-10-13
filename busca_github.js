(function(window) {
    'use strict';

    /**
     * --- Módulo de Repositórios do GitHub ---
     * Este script unificado busca e exibe repositórios do GitHub do usuário.
     * Ele é projetado para ser usado em diferentes páginas (como index e projetos)
     * com configurações específicas para cada uma.
     */

    // --- Configurações Globais ---
    const GITHUB_USER = 'WevertonGomesCosta';
    const CACHE_VERSION = 'v13'; // Incrementar para invalidar caches antigos
    const CACHE_KEY = `gh_repos_cache_${CACHE_VERSION}`;
    const CACHE_TS_KEY = `gh_repos_cache_ts_${CACHE_VERSION}`;
    const CACHE_TTL = 1000 * 60 * 60 * 24; // Cache de 24 horas
    const GITHUB_PROXY_URL = 'https://corsproxy.io/?';

    // --- Estado do Módulo ---
    let state = {
        allRepos: [],
        filteredRepos: [],
        showingCount: 0,
        currentFilter: '',
        isFetching: false,
        lang: 'pt',
        translations: {}
    };

    // --- Configuração da Instância (definida no init) ---
    let config = {};

    // --- Funções Utilitárias ---
    function getFallbackRepos() {
        return [
            { "name": "Genomic-Selection-for-Drought-Tolerance-Using-Genome-Wide-SNPs-in-Casava", "html_url": "https://github.com/WevertonGomesCosta/Genomic-Selection-for-Drought-Tolerance-Using-Genome-Wide-SNPs-in-Casava", "description": "This website is a project for analysis of the Genomic Selection for Drought Tolerance Using Genome Wide GBS and/or DART in Cassava by EMBRAPA Mandioca.", "language": "R", "stargazers_count": 2, "forks_count": 0, "updated_at": "2022-10-20T17:47:16Z", "topics": ["cassava", "eda", "gblup", "genomic-selection", "mixed-models", "multi-environment", "rr-blup", "single-environment"] },
            { "name": "Bovine-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow", "html_url": "https://github.com/WevertonGomesCosta/Bovine-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow", "description": "Mask R-CNN for object detection and instance segmentation on Keras and TensorFlow", "language": "Python", "stargazers_count": 1, "forks_count": 1, "updated_at": "2022-12-01T14:00:58Z", "topics": [] },
            { "name": "Genetic-diversity-and-interaction-between-the-maintainers-of-commercial-Soybean-cultivars-using-self", "html_url": "https://github.com/WevertonGomesCosta/Genetic-diversity-and-interaction-between-the-maintainers-of-commercial-Soybean-cultivars-using-self", "description": "Script to article https://wevertongomescosta.github.io/Genetic-diversity-and-interaction-between-the-maintainers-of-commercial-Soybean-cultivars-using-self ", "language": "R", "stargazers_count": 1, "forks_count": 0, "updated_at": "2022-06-20T17:48:43Z", "topics": [] },
            { "name": "Pig-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow", "html_url": "https://github.com/WevertonGomesCosta/Pig-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow", "description": "Mask R-CNN for object detection and instance segmentation on Keras and TensorFlow", "language": "Python", "stargazers_count": 0, "forks_count": 3, "updated_at": "2022-07-04T19:06:20Z", "topics": [] },
            { "name": "Integrating-nir-genomic-kernel", "html_url": "https://github.com/WevertonGomesCosta/Integrating-nir-genomic-kernel", "description": "Demonstrar que a fusão de dados espectrais e genômicos pode aumentar significativamente a acurácia da predição fenotípica, contribuindo para decisões mais eficientes em programas de seleção", "language": "R", "stargazers_count": 0, "forks_count": 0, "updated_at": "2025-08-29T17:16:37Z", "topics": [] },
            { "name": "Machine-learning-e-redes-neurais-artificiais-no-melhoramento-genetico-do-cafeeiro", "html_url": "https://github.com/WevertonGomesCosta/Machine-learning-e-redes-neurais-artificiais-no-melhoramento-genetico-do-cafeeiro", "description": "Este repositório desenvolve e compara métodos de machine learning e redes neurais artificiais para aprimorar a seleção genômica ampla (GWS) em Coffea arabica e identificar marcadores SNP informativos.", "language": "R", "stargazers_count": 0, "forks_count": 0, "updated_at": "2025-07-09T11:55:40Z", "topics": ["breeding", "coffee", "genetics", "machine-learning", "neural-network"] }
        ];
    }

    function titleCase(str) {
        if (!str) return '';
        return str.replace(/[-_]/g, ' ')
            .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }

    function debounce(fn, wait = 250) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    // --- Lógica de Cache ---
    function readCache() {
        try {
            const ts = Number(localStorage.getItem(CACHE_TS_KEY) || 0);
            if (Date.now() - ts < CACHE_TTL) {
                return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
            }
        } catch (e) {
            console.warn('Falha ao ler cache de repositórios:', e);
        }
        return null;
    }

    function writeCache(data) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
        } catch (e) {
            console.warn('Falha ao escrever no cache de repositórios:', e);
        }
    }

    // --- Lógica da API do GitHub ---
    async function fetchAllPages(url) {
        let results = [];
        let nextUrl = url;
        while (nextUrl) {
            const response = await fetch(`${GITHUB_PROXY_URL}${encodeURIComponent(nextUrl)}`);
            if (!response.ok) {
                throw new Error(`A requisição à API do GitHub falhou: ${response.status}`);
            }
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
    }

    async function fetchRepos() {
        if (state.isFetching) return;
        state.isFetching = true;
        updateMetaTextSafely('fetching_repos', 'Buscando repositórios...');

        const cachedRepos = readCache();
        if (cachedRepos && cachedRepos.length > 0) {
            state.allRepos = cachedRepos;
            updateMetaTextSafely('loaded_repos_cache', `Carregado ${cachedRepos.length} repositórios do cache.`, cachedRepos.length);
            state.isFetching = false;
            filterAndRender();
            return;
        }

        try {
            const initialUrl = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100`;
            const data = await fetchAllPages(initialUrl);
            state.allRepos = data.map(r => ({
                name: r.name, html_url: r.html_url, description: r.description || '', language: r.language || '', stargazers_count: r.stargazers_count || 0, forks_count: r.forks_count || 0, updated_at: r.updated_at, topics: r.topics || [], has_pages: r.has_pages, homepage: r.homepage
            }));
            writeCache(state.allRepos);
            updateMetaTextSafely('found_repos', `Encontrado ${state.allRepos.length} repositórios.`, state.allRepos.length);
        } catch (err) {
            console.error("Falha ao buscar repositórios do GitHub:", err);
            updateMetaTextSafely('fetch_error', 'Erro ao buscar repositórios. Usando dados de fallback.');
            state.allRepos = getFallbackRepos();
        } finally {
            state.isFetching = false;
            filterAndRender();
        }
    }

    // --- Renderização na DOM ---
    function createCard(repo) {
        const card = document.createElement('div');
        card.className = 'project-card card';
        card.setAttribute('role', 'listitem');

        const lang = state.lang;
        const translations = state.translations[lang] || {};
        const siteUrl = repo.homepage || (repo.has_pages ? `https://${GITHUB_USER}.github.io/${repo.name}/` : null);

        let actionsHtml = '';
        const liveSiteBtn = translations['repo-live-site'] || 'Ver Site';
        const repoBtn = translations['repo-view-repo'] || 'Repositório';

        if (siteUrl) {
            actionsHtml += `<a class="link-btn" href="${siteUrl}" target="_blank" rel="noopener">${liveSiteBtn}</a>`;
        }
        actionsHtml += `<a class="link-btn ${siteUrl ? 'secondary' : ''}" href="${repo.html_url}" target="_blank" rel="noopener">${repoBtn}</a>`;

        let metaBottomHtml = `<span class="badge">${repo.language || '—'}</span>`;
        if (config.isPaginated) {
             const updatedAtText = translations.updated_at || 'Atualizado em';
             metaBottomHtml += `<span class="small-muted">${updatedAtText} ${new Date(repo.updated_at).toLocaleDateString()}</span>`;
        }

        card.innerHTML = `
            <div class="project-top">
                <h3>${titleCase(repo.name)}</h3>
                <div class="project-meta">
                    <span class="badge" aria-label="${repo.stargazers_count} estrelas">⭐ ${repo.stargazers_count}</span>
                    <span class="badge" aria-label="${repo.forks_count} forks">🍴 ${repo.forks_count}</span>
                </div>
            </div>
            <p class="project-desc">${repo.description || (translations.no_description || 'Sem descrição.')}</p>
            <div class="project-topics">
                ${(repo.topics || []).slice(0, 4).map(topic => `<span class="topic-tag">${topic}</span>`).join('')}
            </div>
            <div class="project-meta" style="margin-top: auto;">
                ${metaBottomHtml}
            </div>
            <div class="actions">${actionsHtml}</div>
        `;
        return card;
    }

    function updateMetaTextSafely(key, fallbackText, ...args) {
        if (!config.metaEl) return;
        const trans = state.translations[state.lang] || {};
        const msgOrFunc = trans[key];
        const text = typeof msgOrFunc === 'function' ? msgOrFunc(...args) : (msgOrFunc || fallbackText);
        config.metaEl.textContent = text;
    }

    function sortRepos(arr) {
        return [...arr].sort((a, b) =>
            b.stargazers_count - a.stargazers_count ||
            b.forks_count - a.forks_count ||
            new Date(b.updated_at) - new Date(a.updated_at)
        );
    }

    function render() {
        if (!config.listEl) return;

        config.listEl.innerHTML = '';
        const translations = state.translations[state.lang] || {};
        const reposToDisplay = state.filteredRepos.slice(0, state.showingCount);

        if (state.filteredRepos.length === 0 && !state.isFetching) {
            config.listEl.innerHTML = `<div class="project-card" style="grid-column: 1 / -1;">
                <p class="project-desc">${translations.no_repos_found || 'Nenhum repositório encontrado.'}</p>
            </div>`;
        } else {
            reposToDisplay.forEach(repo => {
                const cardElement = createCard(repo);
                config.listEl.appendChild(cardElement);
            });
        }

        if (config.shownCountEl) {
            config.shownCountEl.textContent = `${reposToDisplay.length} / ${state.filteredRepos.length}`;
        }

        if (config.loadMoreBtnEl) {
            const hasMore = state.showingCount < state.filteredRepos.length;
            const hasFilter = state.currentFilter.trim() !== '';
            config.loadMoreBtnEl.classList.toggle('hidden', !hasMore || hasFilter);
        }
    }

    function filterAndRender() {
        const filter = state.currentFilter.trim().toLowerCase();
        let filtered = state.allRepos;

        if (filter) {
            filtered = state.allRepos.filter(r =>
                r.name.toLowerCase().includes(filter) ||
                (r.description || '').toLowerCase().includes(filter) ||
                (r.language || '').toLowerCase().includes(filter) ||
                r.topics.some(t => t.toLowerCase().includes(filter))
            );
        }
        state.filteredRepos = sortRepos(filtered);

        if (config.isPaginated && !filter) {
            state.showingCount = Math.min(config.initialCount, state.filteredRepos.length);
        } else {
            state.showingCount = state.filteredRepos.length;
        }

        if (!config.isPaginated) {
             updateMetaTextSafely('showing_repos', `Exibindo ${state.filteredRepos.length} de ${state.allRepos.length} repositórios.`, state.filteredRepos.length, state.allRepos.length);
        }
        render();
    }

    // --- Inicialização e Eventos ---
    function attachEventListeners() {
        if (config.searchEl) {
            config.searchEl.addEventListener('input', debounce(e => {
                state.currentFilter = e.target.value;
                filterAndRender();
            }));
        }

        if (config.clearBtnEl) {
            config.clearBtnEl.addEventListener('click', () => {
                if (config.searchEl) config.searchEl.value = '';
                state.currentFilter = '';
                filterAndRender();
                if (config.searchEl) config.searchEl.focus();
            });
        }

        if (config.loadMoreBtnEl && config.isPaginated) {
            config.loadMoreBtnEl.addEventListener('click', () => {
                state.showingCount = Math.min(state.showingCount + config.incrementCount, state.filteredRepos.length);
                render();
            });
        }
    }

    function init(userConfig) {
        const listEl = document.querySelector(userConfig.listSelector);
        if (!listEl) {
            console.error('Elemento da lista de projetos não encontrado:', userConfig.listSelector);
            return;
        };

        config = {
            listEl: listEl,
            metaEl: document.querySelector(userConfig.metaSelector),
            searchEl: document.querySelector(userConfig.searchSelector),
            clearBtnEl: document.querySelector(userConfig.clearBtnSelector),
            loadMoreBtnEl: document.querySelector(userConfig.loadMoreBtnSelector),
            shownCountEl: document.querySelector(userConfig.shownCountSelector),
            isPaginated: userConfig.isPaginated || false,
            initialCount: userConfig.initialCount || 3,
            incrementCount: userConfig.incrementCount || 3
        };

        state.lang = window.currentLang || 'pt';
        state.translations = window.translations || { pt: {} };

        attachEventListeners();
        fetchRepos();
    }
    
    function reRenderWithCurrentLang() {
        state.lang = window.currentLang || 'pt';
        state.translations = window.translations || { pt: {} };
        // CORREÇÃO: Renderiza incondicionalmente. A função `filterAndRender` já lida com listas vazias.
        filterAndRender();
    }

    window.GithubReposModule = { init };

    // Para compatibilidade com a função setLanguage() existente no HTML
    window.githubScript_proj = {
        renderAll: reRenderWithCurrentLang
    };

})(window);


// --- Lógica de Inicialização Específica para cada Página ---
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('projects-list')) return;

    // Configuração para a PÁGINA PRINCIPAL (possui botão de "Ver mais")
    if (document.getElementById('toggle-more')) {
        window.GithubReposModule.init({
            listSelector: '#projects-list',
            metaSelector: '#projects-meta',
            searchSelector: '#project-search',
            clearBtnSelector: '#clear-btn',
            loadMoreBtnSelector: '#toggle-more',
            shownCountSelector: '#shown-count',
            isPaginated: true,
            initialCount: 3,
            incrementCount: 3
        });
    }
    // Configuração para a PÁGINA DE PROJETOS (mostra todos)
    else {
        window.GithubReposModule.init({
            listSelector: '#projects-list',
            metaSelector: '#projects-meta',
            searchSelector: '#project-search',
            clearBtnSelector: '#clear-btn',
            isPaginated: false
        });
    }
});

