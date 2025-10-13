        // --- Script para buscar repositórios do GitHub ---
        window.githubScript = (function() {
            const GITHUB_USER = 'WevertonGomesCosta';
            const CACHE_KEY = 'gh_repos_cache_v8';
            const CACHE_TS_KEY = 'gh_repos_cache_ts_v8';
            const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 horas
            const GITHUB_PROXY_URL = 'https://corsproxy.io/?';

            const fallbackRepos = [
                { "name": "Genomic-Selection-for-Drought-Tolerance-Using-Genome-Wide-SNPs-in-Casava", "html_url": "https://github.com/WevertonGomesCosta/Genomic-Selection-for-Drought-Tolerance-Using-Genome-Wide-SNPs-in-Casava", "description": "This website is a project for analysis of the Genomic Selection for Drought Tolerance Using Genome Wide GBS and/or DART in Cassava by EMBRAPA Mandioca.", "language": "R", "stargazers_count": 2, "forks_count": 0, "updated_at": "2022-10-20T17:47:16Z", "topics": ["cassava", "eda", "gblup", "genomic-selection", "mixed-models", "multi-environment", "rr-blup", "single-environment"] },
                { "name": "Bovine-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow", "html_url": "https://github.com/WevertonGomesCosta/Bovine-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow", "description": null, "language": "Python", "stargazers_count": 1, "forks_count": 1, "updated_at": "2022-12-01T14:00:58Z", "topics": [] },
                { "name": "Genetic-diversity-and-interaction-between-the-maintainers-of-commercial-Soybean-cultivars-using-self", "html_url": "https://github.com/WevertonGomesCosta/Genetic-diversity-and-interaction-between-the-maintainers-of-commercial-Soybean-cultivars-using-self", "description": "Script to article https://wevertongomescosta.github.io/Genetic-diversity-and-interaction-between-the-maintainers-of-commercial-Soybean-cultivars-using-self ", "language": "R", "stargazers_count": 1, "forks_count": 0, "updated_at": "2022-06-20T17:48:43Z", "topics": [] },
                { "name": "Pig-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow", "html_url": "https://github.com/WevertonGomesCosta/Pig-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow", "description": "Mask R-CNN for object detection and instance segmentation on Keras and TensorFlow", "language": "Python", "stargazers_count": 0, "forks_count": 3, "updated_at": "2022-07-04T19:06:20Z", "topics": [] },
                { "name": "Integrating-nir-genomic-kernel", "html_url": "https://github.com/WevertonGomesCosta/Integrating-nir-genomic-kernel", "description": "Demonstrar que a fusão de dados espectrais e genômicos pode aumentar significativamente a acurácia da predição fenotípica, contribuindo para decisões mais eficientes em programas de seleção", "language": "R", "stargazers_count": 0, "forks_count": 0, "updated_at": "2025-08-29T17:16:37Z", "topics": [] },
                { "name": "Machine-learning-e-redes-neurais-artificiais-no-melhoramento-genetico-do-cafeeiro", "html_url": "https://github.com/WevertonGomesCosta/Machine-learning-e-redes-neurais-artificiais-no-melhoramento-genetico-do-cafeeiro", "description": "Este repositório desenvolve e compara métodos de machine learning e redes neurais artificiais para aprimorar a seleção genômica ampla (GWS) em Coffea arabica e identificar marcadores SNP informativos. Utiliza dados reais de 195 genótipos (21 211 SNPs) com características de doença e produtividade.", "language": "R", "stargazers_count": 0, "forks_count": 0, "updated_at": "2025-07-09T11:55:40Z", "topics": ["breeding", "coffee", "genetics", "machine-learning", "neural-network"] }
            ];
            let allRepos = []; let showingCount = 3; let currentFilter = '';
            const listEl = document.getElementById('projects-list');
            const metaEl = document.getElementById('projects-meta');
            const searchEl = document.getElementById('project-search');
            const toggleBtn = document.getElementById('toggle-more');
            const shownCountEl = document.getElementById('shown-count');
            const clearBtn = document.getElementById('clear-btn');
            
            function readCache() { try { const ts = Number(localStorage.getItem(CACHE_TS_KEY) || 0); if (Date.now() - ts < CACHE_TTL) { return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'); } } catch (e) { console.warn('Falha ao ler cache', e); } return null; }
            function writeCache(data) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); localStorage.setItem(CACHE_TS_KEY, String(Date.now())); } catch (e) { console.warn('Falha ao escrever cache', e); } }

            async function fetchAllPages(url) {
                let results = []; let nextUrl = url;
                while (nextUrl) {
                    const response = await fetch(`${GITHUB_PROXY_URL}${encodeURIComponent(nextUrl)}`);
                    if (!response.ok) { throw new Error(`GitHub API request failed: ${response.status}`); }
                    const data = await response.json();
                    results = results.concat(data);
                    const linkHeader = response.headers.get('Link');
                    nextUrl = null;
                    if (linkHeader) {
                        const nextLink = linkHeader.split(',').find(s => s.includes('rel="next"'));
                        if (nextLink) { const match = nextLink.match(/<([^>]+)>/); if (match) nextUrl = match[1]; }
                    }
                }
                return results;
            }

            async function fetchRepos() {
                metaEl.textContent = translations[currentLang].fetching_repos;
                const cache = readCache();
                if (cache && cache.length) { allRepos = cache; metaEl.textContent = translations[currentLang].loaded_repos_cache(cache.length); renderAll(); return; }
                try {
                    const initialUrl = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100`;
                    const data = await fetchAllPages(initialUrl);
                    allRepos = data.map(r => ({ name: r.name, html_url: r.html_url, description: r.description || '', language: r.language || '', stargazers_count: r.stargazers_count || 0, forks_count: r.forks_count || 0, updated_at: r.updated_at, topics: r.topics || [] }));
                    writeCache(allRepos); metaEl.textContent = translations[currentLang].found_repos(allRepos.length); renderAll();
                } catch (err) { console.error("Falha ao buscar no GitHub:", err); metaEl.textContent = translations[currentLang].fetch_error; allRepos = fallbackRepos; renderAll(); }
            }
            
            function sortRepos(arr) { return [...arr].sort((a, b) => b.stargazers_count - a.stargazers_count || b.forks_count - a.forks_count || new Date(b.updated_at) - new Date(a.updated_at)); }
            
            function createCard(repo) {
                const lang = currentLang; const tags = [repo.language, ...(repo.topics || [])].filter(Boolean).map(t => t.toLowerCase().replace(/ /g, '-'));
                const cardHTML = `
                    <div class="project-top"><h3>${escapeHtml(titleCase(repo.name))}</h3><div class="project-meta"><span class="badge">⭐ ${repo.stargazers_count}</span><span class="badge">🍴 ${repo.forks_count}</span></div></div>
                    <p class="project-desc">${escapeHtml(repo.description || translations[lang].no_description)}</p>
                    <div class="project-topics"></div>
                    <div class="project-meta" style="margin-top: auto;"><span class="badge">${escapeHtml(repo.language || '—')}</span><span class="small-muted">${translations[lang].updated_at} ${new Date(repo.updated_at).toLocaleDateString()}</span></div>
                    <div class="actions"><a class="link-btn" href="${repo.html_url}" target="_blank" rel="noopener">${translations[lang].open_btn}</a><button class="link-btn secondary" data-copy="${repo.html_url}">${translations[lang].copy_btn}</button></div>`;
                const card = document.createElement('div'); card.className = 'project-card card'; card.setAttribute('role', 'listitem'); card.dataset.tags = tags.join(','); card.innerHTML = cardHTML;
                const topicsContainer = card.querySelector('.project-topics');
                if (topicsContainer && repo.topics && repo.topics.length > 0) { repo.topics.slice(0, 4).forEach(topic => { const tag = document.createElement('span'); tag.className = 'topic-tag'; tag.textContent = topic; topicsContainer.appendChild(tag); }); }
                return card;
            }
            
            function render() {
                listEl.innerHTML = ''; const lang = currentLang; const filter = currentFilter.trim().toLowerCase();
                const filtered = filter ? allRepos.filter(r => r.name.toLowerCase().includes(filter) || (r.description || '').toLowerCase().includes(filter) || (r.language || '').toLowerCase().includes(filter) || r.topics.some(t => t.toLowerCase().includes(filter))) : allRepos;
                const sorted = sortRepos(filtered); const toShow = filter ? sorted.length : Math.min(showingCount, sorted.length);
                if (sorted.length === 0) { listEl.innerHTML = `<div class="project-card"><p class="project-desc">${translations[lang].no_repos_found}</p></div>`; } 
                else { sorted.slice(0, toShow).forEach(repo => { const cardElement = createCard(repo); listEl.appendChild(cardElement); }); }
                shownCountEl.textContent = `${toShow} / ${sorted.length}`;
                toggleBtn.classList.toggle('hidden', filter || toShow >= sorted.length);
                toggleBtn.textContent = translations[lang][toShow >= sorted.length ? 'show-less' : 'show-more'];
            }
            
            function renderAll() { render(); }
            function onCopy(e) { const url = e.target.getAttribute('data-copy'); navigator.clipboard.writeText(url).then(() => { const prev = e.target.textContent; e.target.textContent = translations[currentLang].copied_btn; setTimeout(() => e.target.textContent = prev, 1500); }); }
            function titleCase(str) { return (str || '').replace(/[-_]/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); }
            function escapeHtml(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
            const debounce = (fn, wait = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), wait); }; };

            searchEl.addEventListener('input', debounce(e => { currentFilter = e.target.value; render(); }));
            clearBtn.addEventListener('click', () => { searchEl.value = ''; currentFilter = ''; showingCount = 3; render(); searchEl.focus(); });
            toggleBtn.addEventListener('click', () => { 
                const filter = currentFilter.trim().toLowerCase();
                const filtered = filter ? allRepos.filter(r => r.name.toLowerCase().includes(filter) || (r.description || '').toLowerCase().includes(filter) || (r.language || '').toLowerCase().includes(filter) || r.topics.some(t => t.toLowerCase().includes(filter))) : allRepos;
                showingCount = Math.min(showingCount + 3, filtered.length);
                render(); 
            });
            listEl.addEventListener('click', e => { if (e.target.matches('button[data-copy]')) onCopy(e); });
            
            fetchRepos();
            return { renderAll, get allRepos() { return allRepos; }, set showingCount(value) { showingCount = value; } };
        })();