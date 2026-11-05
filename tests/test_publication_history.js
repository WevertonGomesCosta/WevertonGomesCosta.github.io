'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'utils.js'), 'utf8');
const fallback = JSON.parse(fs.readFileSync(path.join(root, 'fallback-data.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'translations.json'), 'utf8'));

function extract(start, end) {
    const i = source.indexOf(start);
    const j = source.indexOf(end, i);
    assert.ok(i >= 0 && j > i, 'Missing JavaScript function: ' + start);
    return source.slice(i, j + 6);
}
const process = extract(
    '    function processPlatformData(platformPrefix, dataKey) {',
    '\n    }\n\n    // --- RENDERIZAÇÃO ---'
);
const renderer = extract(
    '    function renderPlatform(platformPrefix, shouldAnimate = true) {',
    '\n    }\n\n    function updatePeriodLabels('
);
const sharedPlot = extract(
    '    function renderDualAxisChart(container, rawData, platform, shouldAnimate) {',
    '\n    }\n\n    // --- CARROSSEL ---'
);

const elements = {};
const calls = [];
let clickHandler = null;
let publicationRenderCount = 0;
const chart = {
    innerHTML: '',
    getBoundingClientRect() { return { width: 650 }; },
    on(name, cb) {
        assert.equal(name, 'plotly_click');
        clickHandler = cb;
    }
};
elements['scopus-chart'] = chart;
for (const name of ['pubs', 'cit', 'h', 'i10']) {
    elements['scopus-' + name] = { textContent: '', style: {} };
    elements['scopus-' + name + '-period'] = { textContent: '', style: {} };
}

const Plotly = {
    newPlot(...args) { calls.push(args); return Promise.resolve(); },
    react(...args) { calls.push(args); return Promise.resolve(); }
};
const FixedDate = class extends Date {
    static now() { return Date.parse('2026-11-05T13:00:00Z'); }
};
const sandbox = {
    window: {
        fallbackData: fallback,
        translations: catalog,
        currentLang: 'pt',
        innerWidth: 1200,
        Plotly
    },
    Plotly,
    Date: FixedDate,
    MotionPreference: { isReduced() { return false; } },
    document: { getElementById(id) { return elements[id] ?? null; } },
    updatePeriodLabels() {},
    animateCountUp() { throw Error('Unexpected animation in static test'); },
    renderPublications() { publicationRenderCount++; },
    updateFilterUI() {},
    initialPubsToShow: 3,
    showingPubsCount: 3,
    activeYearFilter: null,
    setTimeout,
    clearTimeout
};
vm.createContext(sandbox);
vm.runInContext(
    'let dashboardData = {};\n' + process + '\n' + sharedPlot + '\n' + renderer +
    '\ndashboardData.scopus = processPlatformData("scopus", "scopus");' +
    '\nglobalThis.renderScopus = () => renderPlatform("scopus", false);' +
    '\nglobalThis.chartData = dashboardData.scopus;',
    sandbox
);
const clean = value => JSON.parse(JSON.stringify(value));
const expected = fallback.academicData.scopus.profile.cited_by.graph;
const scholarGraph = fallback.academicData.google_scholar.profile.cited_by.graph;
assert.ok(expected.length > 0, 'Restored Scopus yearly data must be present');
assert.ok(expected.every(p => Object.keys(p).sort().join(',') === 'citations,publications,year'));
assert.notDeepEqual(expected, scholarGraph);

sandbox.renderScopus();
assert.equal(calls.length, 1);
const [container, traces, layout, config] = calls[0];
assert.equal(container, chart);
assert.equal(traces.length, 2);
assert.equal(traces[0].type, 'bar');
assert.equal(traces[1].type, 'scatter');
assert.equal(traces[1].mode, 'lines+markers');
assert.deepEqual(clean(traces[0].x), expected.map(p => p.year));
assert.deepEqual(clean(traces[0].y), expected.map(p => p.publications));
assert.deepEqual(clean(traces[1].y), expected.map(p => p.citations));
assert.equal(traces[0].name, catalog.pt['chart-pubs']);
assert.equal(traces[1].name, catalog.pt['chart-cits'] || 'Citações');
assert.equal(traces[1].line.color, '#ff7f0e');
assert.equal(layout.height, 350);
assert.equal(layout.hovermode, 'x unified');
assert.equal(layout.legend.orientation, 'h');
assert.equal(layout.yaxis2.overlaying, 'y');
assert.equal(layout.xaxis.dtick, 1);
assert.equal(config.displayModeBar, false);
assert.equal(typeof clickHandler, 'function');
assert.equal(elements['scopus-cit'].textContent, String(fallback.academicData.scopus.profile.cited_by.table[0].citations.all));

clickHandler({ points: [{ x: 2024 }] });
assert.equal(sandbox.activeYearFilter, 2024);
assert.equal(publicationRenderCount, 1);
clickHandler({ points: [{ x: 2024 }] });
assert.equal(sandbox.activeYearFilter, null);

sandbox.window.currentLang = 'en';
sandbox.window.innerWidth = 420;
sandbox.renderScopus();
assert.equal(calls.length, 2);
assert.equal(calls[1][1][0].name, catalog.en['chart-pubs']);
assert.equal(calls[1][1][1].name, catalog.en['chart-cits'] || 'Citations');
assert.equal(calls[1][2].height, 260);
assert.equal(calls[1][2].xaxis.tickangle, -45);

// A historical freshness marker never changes the plotted source series.
fallback.academicData.scopus.history_status = 'current';
sandbox.renderScopus();
assert.equal(calls.length, 3);

fallback.sourceStates.scopus.last_valid_at = '2026-10-01T09:45:45';
sandbox.renderScopus();
assert.equal(elements['scopus-cit'].textContent, '—', 'Expired author metric must be hidden');
assert.equal(calls.length, 4, 'Historical graph remains available despite expired author summary');

fallback.academicData.scopus.profile.cited_by.graph = [];
sandbox.chartData.graphData = []; // Module caches source data at initialization.
sandbox.window.currentLang = 'pt';
sandbox.renderScopus();
assert.equal(calls.length, 4, 'Never fall back to Scholar when the Scopus history is missing');

// Site UX: accent-insensitive search and a keyboard-accessible year select.
const publicationHtml = fs.readFileSync(path.join(root, 'publicacoes.html'), 'utf8');
const homeHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const html of [publicationHtml, homeHtml]) {
    assert.match(html, /<label for="publication-year"/);
    assert.match(html, /<select id="publication-year"[^>]*>/);
    assert.match(html, /data-key="publication-all-years"/);
    assert.match(html, /data-key="clear-pub-filters"/);
}
assert.match(source, /UI\.pubYearSelect\.addEventListener\('change'/);
assert.doesNotMatch(source, /year-filter-chip/);

const normStart = source.indexOf('    const normalizeTitle = (str) =>');
const normEnd = source.indexOf('\n\n    const publicationTimestamp', normStart);
assert.ok(normStart >= 0 && normEnd > normStart);
const searchFilter = extract(
    '    function getFilteredPublicationList() {',
    '\n    }\n\n    function updateCategoryFilterUI()'
);
const yearFilter = extract(
    '    function updateFilterUI() {',
    '\n    }\n\n    // --- INIT ---'
);
const samplePublications = [
    { title: 'Genômica aplicada', year: '2024', journalTitle: 'Revista Café', publisher: '', isbn: '', authors: ['BORÉM, A.'] },
    { title: 'Seleção vegetal', year: '2026', journalTitle: 'Revista de Pesquisa', publisher: '', isbn: '', authors: ['SILVA, B.'] }
];
const publicationYearSelect = { innerHTML: '', value: '' };
const searchControl = { value: '' };
const uxSandbox = {
    window: { currentLang: 'pt', translations: catalog },
    UI: { pubYearSelect: publicationYearSelect, pubSearchInput: searchControl },
    activeYearFilter: null,
    escapeHtml: value => String(value),
    getPublicationBaseList: () => samplePublications,
    sortPublications: items => items
};
vm.createContext(uxSandbox);
vm.runInContext(
    source.slice(normStart, normEnd) + '\n' + searchFilter + '\n' + yearFilter
        + '\nglobalThis.normalizePublicationSearch = normalizeTitle;'
        + '\nglobalThis.filterPublications = getFilteredPublicationList;'
        + '\nglobalThis.refreshYearFilter = updateFilterUI;',
    uxSandbox
);
assert.equal(uxSandbox.normalizePublicationSearch('BORÉM'), 'borem');
assert.equal(uxSandbox.normalizePublicationSearch('Genômica'), 'genomica');
searchControl.value = 'borem';
assert.deepEqual(
    clean(uxSandbox.filterPublications().map(work => work.year)),
    ['2024']
);
searchControl.value = 'cafe';
assert.deepEqual(
    clean(uxSandbox.filterPublications().map(work => work.year)),
    ['2024']
);
searchControl.value = '';
uxSandbox.activeYearFilter = 2024;
uxSandbox.refreshYearFilter();
assert.equal(publicationYearSelect.value, '2024');
assert.match(publicationYearSelect.innerHTML, /Todos os anos/);
assert.match(publicationYearSelect.innerHTML, /<option value="2026">2026<\/option>/);
assert.match(publicationYearSelect.innerHTML, /<option value="2024">2024<\/option>/);
uxSandbox.window.currentLang = 'en';
uxSandbox.activeYearFilter = null;
uxSandbox.refreshYearFilter();
assert.equal(publicationYearSelect.value, '');
assert.match(publicationYearSelect.innerHTML, /All years/);

// Native select and clear button must update the same year/category state.
const handlerStart = source.indexOf('        if (UI.pubYearSelect) {', source.indexOf('    async function init()'));
const handlerEnd = source.indexOf('\n\n        if(UI.pubsLoadMoreBtn)', handlerStart);
const resetStart = source.indexOf('        if(UI.pubClearBtn) {', source.indexOf('    async function init()'));
const resetEnd = source.indexOf('\n\n        if (UI.pubSortSelect)', resetStart);
assert.ok(handlerStart >= 0 && handlerEnd > handlerStart && resetStart >= 0 && resetEnd > resetStart);
const events = {};
const listenerSandbox = {
    UI: {
        pubYearSelect: { value: '', addEventListener(type, handler) { events['year:' + type] = handler; } },
        pubClearBtn: { addEventListener(type, handler) { events['clear:' + type] = handler; } },
        pubSearchInput: { value: 'cafe', focus() { this.focused = true; } }
    },
    activeYearFilter: null,
    activePublicationCategory: 'chapters',
    showingPubsCount: 3,
    isPublicationsPage: true,
    allWorks: samplePublications,
    initialPubsToShow: 3,
    rendered: 0,
    renderPublications() { this.rendered++; }
};
listenerSandbox.renderPublications = () => { listenerSandbox.rendered++; };
vm.createContext(listenerSandbox);
vm.runInContext(
    source.slice(handlerStart, handlerEnd)
        + '\n' + source.slice(resetStart, resetEnd),
    listenerSandbox
);
listenerSandbox.UI.pubYearSelect.value = '2024';
events['year:change']();
assert.equal(listenerSandbox.activeYearFilter, 2024);
listenerSandbox.UI.pubYearSelect.value = '';
events['year:change']();
assert.equal(listenerSandbox.activeYearFilter, null);
listenerSandbox.activeYearFilter = 2026;
events['clear:click']();
assert.equal(listenerSandbox.activeYearFilter, null);
assert.equal(listenerSandbox.activePublicationCategory, 'articles');
assert.equal(listenerSandbox.UI.pubSearchInput.value, '');
assert.equal(listenerSandbox.UI.pubSearchInput.focused, true);
assert.equal(listenerSandbox.rendered, 3);

// The browser's native dropdown must have a solid dark surface with
// light text; a nonexistent CSS variable made the option background unstable.
const stylesheet = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const selectCss = stylesheet.match(/\.controls select \{([^}]+)\}/);
const optionCss = stylesheet.match(/\.controls select option \{([^}]+)\}/);
assert.ok(selectCss && optionCss, 'Publication dropdown styles are required');
for (const declaration of [selectCss[1], optionCss[1]]) {
    assert.match(declaration, /background:\s*var\(--dark-light\)/);
    assert.match(declaration, /color:\s*var\(--text\)/);
}
assert.match(selectCss[1], /color-scheme:\s*dark/);
assert.doesNotMatch(optionCss[1], /var\(--bg\)/);
const lum = hex => {
    const values = [1, 3, 5]
        .map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
        .map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
    return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
};
const textColor = '#e2e8f0';
const menuColor = '#1e293b';
assert.ok((lum(textColor) + 0.05) / (lum(menuColor) + 0.05) >= 7);
assert.match(homeHtml, /style\.css\?v=20261105-dropdown-contrast/);
assert.match(publicationHtml, /style\.css\?v=20261105-dropdown-contrast/);


// Lot 2: per-work citation counts must not confuse unavailable with observed zero.
const academicRegistry = JSON.parse(fs.readFileSync(path.join(root, 'academic-registry.json'), 'utf8'));
const citationMetrics = JSON.parse(fs.readFileSync(path.join(root, 'bibliometric-metrics.json'), 'utf8'));
assert.equal(academicRegistry.works.length, academicRegistry.summary.total_records);
assert.ok(academicRegistry.works.every(work => citationMetrics.publications[work.id]));

const sortStart = source.indexOf('    const hasObservedCitation = (work) =>');
const sortEnd = source.indexOf('    const publicationCitationMetric =', sortStart);
assert.ok(sortStart >= 0 && sortEnd > sortStart);
const rankVM = {
    window: { currentLang: 'pt', translations: catalog },
    activePublicationSort: 'citations_desc',
    publicationTimestamp: work => Date.UTC(Number(work.year || 2024), 0, 1),
    comparePublicationTitles: (a, b) => a.title.localeCompare(b.title),
    escapeHtml: value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
};
vm.createContext(rankVM);
vm.runInContext(
    source.slice(sortStart, sortEnd) +
    '\nglobalThis.rankCitations = sortPublications;' +
    '\nglobalThis.isCitationObserved = hasObservedCitation;',
    rankVM
);
const exampleWorks = [
    { id: 'missing', type: 'journal_article', status: 'published', title: 'Missing', year: '2026', cited_by: { value: 0, status: 'value_unavailable' } },
    { id: 'zero', type: 'journal_article', status: 'published', title: 'Observed zero', year: '2025', cited_by: { value: 0, status: 'observed' } },
    { id: 'positive', type: 'journal_article', status: 'published', title: 'Observed five', year: '2024', cited_by: { value: 5, status: 'observed' } },
    { id: 'retained', type: 'journal_article', status: 'published', title: 'Retained three', year: '2023', cited_by: { value: 3, status: 'stale' } }
];
assert.equal(rankVM.isCitationObserved(exampleWorks[0]), false);
assert.equal(rankVM.isCitationObserved(exampleWorks[1]), true);
assert.deepEqual(
    clean(rankVM.rankCitations(exampleWorks).map(work => work.id)),
    ['positive', 'retained', 'zero', 'missing']
);
assert.deepEqual(
    clean(rankVM.rankCitations(exampleWorks, 'date_desc').map(work => work.id)),
    ['missing', 'zero', 'positive', 'retained']
);

const renderStart = source.indexOf('    function renderPublications() {');
const renderEnd = source.indexOf('\n\n    function generateBibTeX()', renderStart);
assert.ok(renderStart >= 0 && renderEnd > renderStart);
const listingGrid = { innerHTML: '' };
rankVM.UI = { pubsGrid: listingGrid, pubsShownCount: { textContent: '' }, pubsLoadMoreBtn: { style: {} } };
rankVM.getFilteredPublicationList = () => exampleWorks;
rankVM.updateCategoryFilterUI = () => {};
rankVM.updateFilterUI = () => {};
rankVM.publicationTypeKey = () => 'pub-type-article';
rankVM.showingPubsCount = exampleWorks.length;
rankVM.isPublicationsPage = true;
vm.runInContext(
    source.slice(renderStart, renderEnd) +
    '\nglobalThis.renderCitationCards = renderPublications;',
    rankVM
);
rankVM.renderCitationCards();
assert.match(listingGrid.innerHTML, /Google Scholar: 0 citações/);
assert.match(listingGrid.innerHTML, /Google Scholar: 5 citações/);
assert.match(listingGrid.innerHTML, /Google Scholar: citações não disponíveis/);
assert.match(listingGrid.innerHTML, /\(valor anterior preservado\)/);
assert.equal((listingGrid.innerHTML.match(/publication-card/g) || []).length, 4);
rankVM.window.currentLang = 'en';
rankVM.renderCitationCards();
assert.match(listingGrid.innerHTML, /Google Scholar: 0 citations/);
assert.match(listingGrid.innerHTML, /Google Scholar: citation count unavailable/);
assert.match(source, /function generateBibTeX\(\)/);
assert.match(publicationHtml, /id="export-bibtex-btn"/);

// The coverage note reads two independent populations; source totals are
// not added together, and it must not invent zero when snapshot is missing.
const coverageStart = source.indexOf('    function renderCoverageNote() {');
const coverageEnd = source.indexOf('\n\n    // --- RENDERIZAÇÃO ---', coverageStart);
assert.ok(coverageStart >= 0 && coverageEnd > coverageStart);
const coverageEl = { textContent: '' };
const coverageVM = {
    window: {
        currentLang: 'pt', translations: catalog,
        academicRegistry, fallbackData: fallback
    },
    document: { getElementById(id) { return id === 'bibliometric-coverage-note' ? coverageEl : null; } }
};
vm.createContext(coverageVM);
vm.runInContext(source.slice(coverageStart, coverageEnd) +
    '\nglobalThis.showCoverage = renderCoverageNote;', coverageVM);
coverageVM.showCoverage();
assert.match(coverageEl.textContent, /Catálogo canônico: 34 trabalhos/);
assert.match(coverageEl.textContent, /Google Scholar 38, Scopus 24 e Web of Science 22 registros/);
assert.match(coverageEl.textContent, /não devem ser somados/);
coverageVM.window.currentLang = 'en';
coverageVM.showCoverage();
assert.match(coverageEl.textContent, /Canonical catalog: 34 works/);
assert.match(coverageEl.textContent, /must not be added together/);
coverageVM.window.academicRegistry = null;
coverageVM.showCoverage();
assert.match(coverageEl.textContent, /different coverage criteria/);

// Annual tables provide source-faithful textual access, including retained
// Scopus history and explicit empty-state messaging.
const historyStart = source.indexOf('    function renderHistoricalTable(platformPrefix, rawData) {');
const historyEnd = source.indexOf('\n\n    function renderCoverageNote()', historyStart);
assert.ok(historyStart >= 0 && historyEnd > historyStart);
const tableBody = { innerHTML: '' };
const historyNote = { textContent: '' };
const tableVM = {
    window: {
        currentLang: 'pt', translations: catalog,
        fallbackData: { academicData: { scopus: { history_status: 'stale' } } }
    },
    document: { getElementById(id) {
        if (id === 'scopus-history-body') return tableBody;
        if (id === 'scopus-history-status') return historyNote;
        return null;
    } },
    escapeHtml: value => String(value ?? '')
};
vm.createContext(tableVM);
vm.runInContext(source.slice(historyStart, historyEnd) +
    '\nglobalThis.showAnnualTable = renderHistoricalTable;', tableVM);
tableVM.showAnnualTable('scopus', [
    { year: 2023, publications: 2, citations: 0 },
    { year: 2025, publications: 3, citations: 7 }
]);
assert.match(tableBody.innerHTML, /<th scope="row">2025<\/th><td>3<\/td><td>7<\/td>/);
assert.match(tableBody.innerHTML, /<th scope="row">2024<\/th><td>0<\/td><td>0<\/td>/);
assert.match(tableBody.innerHTML, /<th scope="row">2023<\/th><td>2<\/td><td>0<\/td>/);
assert.match(historyNote.textContent, /Scopus/);
tableVM.window.currentLang = 'en';
tableVM.showAnnualTable('scopus', []);
assert.match(tableBody.innerHTML, /Annual data unavailable/);
assert.match(historyNote.textContent, /earlier valid retrieval/);

for (const item of [
    ['scholar', 'Google Scholar'], ['scopus', 'Scopus'], ['wos', 'Web of Science']
]) {
    const name = item[0];
    assert.match(homeHtml, new RegExp('id="' + name + '-history-body"'));
    assert.match(homeHtml, new RegExp('data-key-aria-label="history-aria-' + name + '"'));
    assert.match(homeHtml, new RegExp('id="' + name + '-chart"[^>]*role="img"'));
}
assert.match(homeHtml, /id="bibliometric-coverage-note"/);
assert.match(publicationHtml, /id="bibliometric-coverage-note"/);
assert.match(publicationHtml, /id="pubs-shown-count"[^>]*aria-live=|aria-live="polite"[^>]*id="pubs-shown-count"/);

console.log('PASS: Scopus source, shared dual-axis chart, language, expiry guard, year filter and privacy');
