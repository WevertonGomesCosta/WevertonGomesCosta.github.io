        // --- Script para Google Scholar, ORCID, Validação de Formulário e Geração de PDF ---
        window.scholarScript = (function() {
            const SCHOLAR_USER_ID = "eJNKcHsAAAAJ"; 
            const ORCID_ID = "0000-0003-0742-5936";
            const PROXY_URL = 'https://corsproxy.io/?'; 
            const serpApiLimitMsg = "Limite de buscas gratuitas do SerpApi atingido. As citações e publicações não puderam ser atualizadas automaticamente.";
            let allArticles = []; let showingPubsCount = 3; let citationGraphData = []; let activeYearFilter = null; 

            const normalizeTitle = (str) => {
                if (!str) return '';
                return str
                    .replace(/<[^>]+>/g, '') // Remove tags HTML
                    .replace(/[\u2010-\u2015]/g, '-') // Normaliza hífens
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '') // Remove pontuação (exceto hífens)
                    .replace(/\s+/g, ' ') // Colapsa múltiplos espaços
                    .trim();
            };

            function animateCountUp(el) {
                const target = parseInt(el.textContent, 10);
                if (isNaN(target) || target === 0) { el.textContent = target; return; }
                const duration = 2000; const intervalTime = 20; const steps = duration / intervalTime; const increment = target / steps;
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

            async function fetchFromSerpApi(params) {
                if (typeof SERPAPI_KEY === 'undefined' || !SERPAPI_KEY) {
                    throw new Error("Chave da API (SERPAPI_KEY) não configurada.");
                }
                const baseUrl = 'https://serpapi.com/search.json'; const searchParams = new URLSearchParams({ ...params, api_key: SERPAPI_KEY }); const apiUrl = `${baseUrl}?${searchParams.toString()}`; const proxyRequestUrl = `${PROXY_URL}${encodeURIComponent(apiUrl)}`;
                try {
                    const res = await fetch(proxyRequestUrl);
                    if (!res.ok) { const errorText = await res.text(); console.error("Erro da API ou do Proxy:", errorText); if (errorText.includes("monthly search limit")) throw new Error(serpApiLimitMsg); throw new Error(`Falha na requisição. Status: ${res.status}.`); }
                    return await res.json();
                } catch (error) { console.error("Erro ao buscar dados do Google Scholar:", error); throw error; }
            }
            
            function renderInteractiveChart(graphData, articles) {
                const containerId = 'interactive-scholar-chart-container';
                const container = document.getElementById(containerId);
                if (!container || typeof Plotly === 'undefined' || (!graphData || graphData.length === 0) && (!articles || articles.length === 0)) return;

                const observer = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => { if (entry.isIntersecting) { animateChart(graphData, articles); observer.unobserve(entry.target); } });
                }, { threshold: 0.5 });
                observer.observe(container);
            }

            function animateChart(graphData, articles) {
                const containerId = 'interactive-scholar-chart-container';
                const container = document.getElementById(containerId);
                const yearlyData = {};
                (graphData || []).forEach(item => { yearlyData[item.year] = { citations: item.citations || 0, pubs: 0 }; });
                (articles || []).forEach(article => {
                    const yearMatches = (article.publication || '').match(/\b(19|20)\d{2}\b/g);
                    if (yearMatches) {
                        const year = parseInt(yearMatches[yearMatches.length - 1]);
                        if (year) {
                            if (yearlyData[year]) { yearlyData[year].pubs++; } else { yearlyData[year] = { citations: 0, pubs: 1 }; }
                        }
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
                            activeYearFilter = data.points[0].x;
                            document.getElementById('publication-search').value = '';
                            renderPublications(); updateFilterUI();
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

            async function updateScholarSection() {
                try {
                    const profile = await fetchFromSerpApi({ engine: 'google_scholar_author', author_id: SCHOLAR_USER_ID });
                    if (profile.error) throw new Error(profile.error);
                    const citedBy = profile.cited_by;
                    if (citedBy && citedBy.table && citedBy.table.length >= 3) {
                        const citationsData = citedBy.table.find(item => item.citations)?.citations; const hIndexData = citedBy.table.find(item => item.h_index)?.h_index; const i10IndexData = citedBy.table.find(item => item.i10_index)?.i10_index;
                        if (citationsData) { document.getElementById("cit-total").textContent = citationsData.all ?? '—'; const sinceKey = Object.keys(citationsData).find(k => k.startsWith('since_')); document.getElementById("cit-period").textContent = sinceKey ? citationsData[sinceKey] : '—'; }
                        if (hIndexData) { document.getElementById("h-total").textContent = hIndexData.all ?? '—'; const sinceKey = Object.keys(hIndexData).find(k => k.startsWith('since_')); document.getElementById("h-period").textContent = sinceKey ? hIndexData[sinceKey] : '—'; }
                        if (i10IndexData) { document.getElementById("i10-total").textContent = i10IndexData.all ?? '—'; const sinceKey = Object.keys(i10IndexData).find(k => k.startsWith('since_')); document.getElementById("i10-period").textContent = sinceKey ? i10IndexData[sinceKey] : '—'; }
                    } else if (citedBy?.value) { document.getElementById("cit-total").textContent = citedBy.value ?? '—'; } 
                    else { throw new Error("Dados de citação ('cited_by') não encontrados ou em formato inesperado."); }
                    
                    document.querySelectorAll('.scholar-metrics .metric-value, .scholar-metrics .metric-value-period').forEach(animateCountUp);

                    if (profile.author_url) { document.querySelector(".scholar-link a").href = profile.author_url; }
                    if (profile.cited_by?.graph && Array.isArray(profile.cited_by.graph)) { citationGraphData = profile.cited_by.graph; }
                } catch (e) {
                    console.error("Erro ao atualizar seção do Scholar:", e);
                    const scholarCard = document.querySelector(".scholar-summary-card");
                    if (scholarCard && !scholarCard.querySelector('.scholar-error')) { const errorDiv = document.createElement('div'); errorDiv.className = 'scholar-error'; errorDiv.style.cssText = 'color: var(--error); margin-top: 15px;'; errorDiv.textContent = `Erro ao carregar métricas: ${e.message}`; scholarCard.querySelector(".scholar-link").insertAdjacentElement('afterend', errorDiv); }
                }
            }
            
            function renderPublications(filter = '') {
                const grid = document.getElementById("publicacoes-grid"); const toggleBtn = document.getElementById('pubs-toggle-more'); const shownCountEl = document.getElementById('pubs-shown-count'); grid.innerHTML = ""; 
                let filteredByYear = activeYearFilter ? allArticles.filter(art => art.year === activeYearFilter.toString()) : allArticles;
                const lowerCaseFilter = filter.trim().toLowerCase();
                const filteredArticles = lowerCaseFilter ? filteredByYear.filter(art => Object.values(art).some(val => typeof val === 'string' && val.toLowerCase().includes(lowerCaseFilter))) : filteredByYear;
                const articlesToShow = filteredArticles.slice(0, showingPubsCount);

                if (articlesToShow.length === 0) { grid.innerHTML = `<div class="card" style="grid-column: 1 / -1;"><p>${translations[currentLang].no_pubs_found}</p></div>`; shownCountEl.textContent = `0 / 0`; toggleBtn.classList.add('hidden'); return; }
                
                articlesToShow.forEach((art) => {
                    const card = document.createElement("div");
                    card.className = "card reveal publication-card";

                    const citationText = art.cited_by?.value ? `${translations[currentLang]['pub-cited-by']} ${art.cited_by.value} ${translations[currentLang]['pub-cited-by-times']}` : translations[currentLang]['pub-no-citation'];
                    
                    const publicationMetaHtml = `<p class="publication-meta">${translations[currentLang]['pub-published']}: ${art.year} ${translations[currentLang]['pub-in']} <em>${art.journalTitle}</em></p>`;

                    const doiHtml = art.doi ? `
                        <div class="publication-doi">
                            <a href="https://orcid.org/${ORCID_ID}" target="_blank" rel="noopener" title="Perfil ORCID">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/1/11/DOI_logo.svg" alt="DOI logo"/>
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

            async function fetchAllScholarArticles() {
                let start = 0, allResults = [], hasMore = true;
                while (hasMore) {
                    try {
                        const result = await fetchFromSerpApi({ engine: 'google_scholar_author', author_id: SCHOLAR_USER_ID, hl: 'pt-BR', start: start, num: 20 });
                        if (result.error) throw new Error(result.error.includes("monthly search limit") ? serpApiLimitMsg : result.error);
                        const articles = result.articles || [];
                        if (articles.length === 0) { hasMore = false; } else { allResults = allResults.concat(articles); start += 20; }
                    } catch(e) { console.error(`Erro ao buscar publicações (start=${start}):`, e); hasMore = false; if (allResults.length === 0) throw e; }
                }
                return allResults;
            }
            
            async function fetchOrcidWorks() {
                const API_URL = `https://pub.orcid.org/v3.0/${ORCID_ID}/works`;
                const response = await fetch(`${PROXY_URL}${encodeURIComponent(API_URL)}`, { headers: { 'Accept': 'application/json' }});
                if (!response.ok) throw new Error(`Falha ao buscar dados do ORCID. Status: ${response.status}`);
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

            async function updateScholarPublications() {
                const grid = document.getElementById("publicacoes-grid");
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

                    allArticles = mergedArticles;
                    allArticles.sort((a, b) => (b.cited_by?.value || 0) - (a.cited_by?.value || 0));
                    
                    renderPublications();
                    const articlesForChart = scholarArticles.length > 0 ? scholarArticles : mergedArticles;
                    renderInteractiveChart(citationGraphData, articlesForChart);

                } catch (e) {
                    console.error("Erro ao atualizar publicações:", e);
                    grid.innerHTML = `<div class="card" style="color: var(--error); grid-column: 1 / -1;">Erro ao carregar publicações: ${e.message}</div>`;
                    document.getElementById('interactive-scholar-chart-container').innerHTML = `<div class="card" style="color: var(--error);">Erro ao carregar o gráfico: ${e.message}</div>`;
                }
            }

            function updateFilterUI() {
                const controlsContainer = document.querySelector('#publicacoes .controls'); let filterChip = document.getElementById('year-filter-chip');
                if (activeYearFilter) {
                    if (!filterChip) { filterChip = document.createElement('div'); filterChip.id = 'year-filter-chip'; filterChip.style.cssText = 'background: var(--primary); color: var(--dark); padding: 8px 12px; border-radius: 20px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;'; controlsContainer.appendChild(filterChip); }
                    filterChip.innerHTML = `<span>Filtrando por: ${activeYearFilter}</span><button style="background: none; border: none; color: var(--dark); font-size: 1.2rem; cursor: pointer; line-height: 1;">&times;</button>`;
                    filterChip.querySelector('button').onclick = () => { activeYearFilter = null; renderPublications(document.getElementById('publication-search').value); updateFilterUI(); };
                } else { if (filterChip) { filterChip.remove(); } }
            }

            document.addEventListener("DOMContentLoaded", () => {
                const form = document.getElementById("contact-form");
                form.addEventListener("submit", async function handleSubmit(event) {
                    event.preventDefault(); const status = document.getElementById("form-status"); if (!validateForm()) { status.textContent = ''; return; }
                    const data = new FormData(event.target); status.textContent = translations[currentLang].formSending; status.style.color = 'var(--accent)';
                    try {
                        const response = await fetch(event.target.action, { method: form.method, body: data, headers: { 'Accept': 'application/json' } });
                        if (response.ok) { status.textContent = translations[currentLang].formSuccess; status.style.color = 'var(--primary)'; form.reset(); } 
                        else { const responseData = await response.json(); status.textContent = responseData["errors"]?.map(e => e["message"]).join(", ") || translations[currentLang].formError; status.style.color = 'var(--error)'; }
                    } catch (error) { status.textContent = translations[currentLang].formError; status.style.color = 'var(--error)'; }
                });

                function validateForm() {
                    let isValid = true; const fields = ['name', 'email', 'subject', 'message'];
                    fields.forEach(id => {
                        const input = document.getElementById(id); const errorKey = `form-${id}-error`;
                        if (input.value.trim() === '' || (id === 'email' && !/^\S+@\S+\.\S+$/.test(input.value))) { showError(input, translations[currentLang][errorKey]); isValid = false; } else { clearError(input); }
                    });
                    return isValid;
                }
                function showError(input, message) { const fg = input.parentElement; fg.querySelector('.error-message').textContent = message; fg.querySelector('.error-message').style.display = 'block'; input.classList.add('error'); }
                function clearError(input) { const fg = input.parentElement; fg.querySelector('.error-message').style.display = 'none'; input.classList.remove('error'); }
                
                const metricsObserver = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            updateScholarSection();
                            updateScholarPublications();
                            observer.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.8 });
                metricsObserver.observe(document.querySelector('.scholar-metrics'));

                const pubSearchInput = document.getElementById('publication-search'); const pubClearBtn = document.getElementById('publication-clear-btn'); const pubToggleBtn = document.getElementById('pubs-toggle-more');
                const debounce = (fn, wait = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), wait); }; };
                pubSearchInput.addEventListener('input', debounce(e => { showingPubsCount = 3; renderPublications(e.target.value); }));
                pubClearBtn.addEventListener('click', () => { pubSearchInput.value = ''; showingPubsCount = 3; if (activeYearFilter) { activeYearFilter = null; updateFilterUI(); } renderPublications(); pubSearchInput.focus(); });
                pubToggleBtn.addEventListener('click', () => {
                    const filter = pubSearchInput.value.trim().toLowerCase();
                    let baseList = activeYearFilter ? allArticles.filter(art => (art.publication || '').includes(activeYearFilter)) : allArticles;
                    const filtered = filter ? baseList.filter(art => Object.values(art).some(v => String(v).toLowerCase().includes(filter))) : baseList;
                    showingPubsCount = Math.min(showingPubsCount + 3, filtered.length);
                    renderPublications(filter);
                });

                document.getElementById('download-cv-btn')?.addEventListener('click', (event) => { event.preventDefault(); generateCvPdf(); });
            });

            async function generateCvPdf() {
                const button = document.getElementById('download-cv-btn'); const originalButtonHTML = button.innerHTML; const toast = document.getElementById('toast-notification'); const { jsPDF } = window.jspdf; const pdfTranslations = translations.pdf[currentLang];
                button.innerHTML = `<svg class="animate-spin" ...></svg> <span>Gerando...</span>`; button.style.pointerEvents = 'none'; toast.textContent = 'Preparando seu currículo...'; toast.classList.add('show');
                try {
                    const doc = new jsPDF('p', 'pt', 'a4'); const page_width = doc.internal.pageSize.getWidth(); const margin = 40; let y = margin;
                    const addSectionTitle = (title) => { y += (y > margin ? 20 : 0); doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(0).text(title.toUpperCase(), margin, y); y += 10; doc.setLineWidth(1).line(margin, y - 5, page_width - margin, y - 5); };
                    const addJustifiedText = (content) => { const lines = doc.splitTextToSize(content.replace(/<[^>]+>/g, ' ').trim(), page_width - margin * 2); doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(80).text(lines, margin, y, { align: 'justify' }); y += lines.length * 12 + 5; };
                    
                    const avatarImg = document.querySelector('.avatar'); let avatarDataUrl = null;
                    try { const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(avatarImg.src)}`); const blob = await response.blob(); avatarDataUrl = await new Promise(resolve => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result); reader.readAsDataURL(blob); }); } catch(e) { console.error("Falha ao carregar imagem do avatar:", e); }
                    if (avatarDataUrl) doc.addImage(avatarDataUrl, 'JPEG', margin, y, 80, 80);
                    doc.setFontSize(22).setFont('helvetica', 'bold').text(document.getElementById('hero-name').textContent, margin + 95, y + 25);
                    doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(100).text("Viçosa, MG, Brasil | wevertonufv@gmail.com | linkedin.com/in/wevertoncosta", margin + 95, y + 40);
                    y += 100;
                    
                    addSectionTitle(pdfTranslations['about-title']); addJustifiedText(Array.from(document.querySelectorAll('#sobre p')).map(p => p.innerText).join(' '));
                    
                    doc.save('CV-Weverton_Gomes_da_Costa.pdf'); toast.textContent = 'Download iniciado!';
                } catch (error) { console.error('Erro ao gerar PDF:', error); toast.textContent = 'Erro ao gerar o PDF.'; } finally { button.innerHTML = originalButtonHTML; button.style.pointerEvents = 'auto'; setTimeout(() => toast.classList.remove('show'), 4000); }
            }

            return { renderPublications, renderChart: () => renderInteractiveChart(citationGraphData, allArticles), get allArticles() { return allArticles; } };
        })();