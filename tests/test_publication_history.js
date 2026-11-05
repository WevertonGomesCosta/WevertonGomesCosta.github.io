'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'utils.js'), 'utf8');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'academic-registry.json'), 'utf8'));
const fallback = JSON.parse(fs.readFileSync(path.join(root, 'fallback-data.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'translations.json'), 'utf8'));
const scholarGraph = fallback.academicData.google_scholar.profile.cited_by.graph;

function extract(start, end, endOffset) {
    const i = source.indexOf(start);
    const j = source.indexOf(end, i);
    assert.ok(i >= 0 && j > i, 'Expected source block: ' + start);
    return source.slice(i, j + (endOffset ?? 0));
}

const aggregation = extract('const PortfolioPublicationHistory = {', '\n};', 3);
const display = extract(
    '    function renderPortfolioPublicationChart(shouldAnimate = false) {',
    '\n    }\n\n    // --- RENDERIZAÇÃO ---',
    6
);
const sharedPlot = extract(
    '    function renderDualAxisChart(container, rawData, platform, shouldAnimate, customLabels = null) {',
    '\n    }\n\n    // --- CARROSSEL ---',
    6
);

const calls = [];
let plotClickHandler = null;
let publicationRenderCount = 0;
const chart = {
    dataset: {},
    classList: { contains() { return false; } },
    textContent: '',
    getBoundingClientRect() { return { width: 670 }; },
    on(name, handler) {
        assert.equal(name, 'plotly_click');
        plotClickHandler = handler;
    }
};
const Plotly = {
    newPlot(...args) { calls.push({ action: 'newPlot', args }); return Promise.resolve(); },
    react(...args) { calls.push({ action: 'react', args }); return Promise.resolve(); }
};
const sandbox = {
    window: {
        currentLang: 'pt',
        innerWidth: 1200,
        academicRegistry: registry,
        translations: catalog,
        Plotly
    },
    document: {
        getElementById(id) { return id === 'scopus-chart' ? chart : null; }
    },
    Plotly,
    MotionPreference: { isReduced() { return false; } },
    activeYearFilter: null,
    initialPubsToShow: 3,
    showingPubsCount: 3,
    renderPublications() { publicationRenderCount++; },
    updateFilterUI() {},
    setTimeout,
    clearTimeout
};
vm.createContext(sandbox);
const program = aggregation + '\n' +
    'const dashboardData = {scholar: {graphData: ' +
    JSON.stringify(scholarGraph) +
    '}};\n' +
    sharedPlot + '\n' + display +
    '\nglobalThis.history = PortfolioPublicationHistory;' +
    '\nglobalThis.renderChart = renderPortfolioPublicationChart;' +
    '\nglobalThis.data = dashboardData;';
vm.runInContext(program, sandbox);

const clean = value => JSON.parse(JSON.stringify(value));
const publicationHistory = clean(sandbox.history.byYear(registry));
assert.deepEqual(publicationHistory, [
    { year: 2019, publications: 2 },
    { year: 2020, publications: 2 },
    { year: 2021, publications: 6 },
    { year: 2022, publications: 3 },
    { year: 2023, publications: 3 },
    { year: 2024, publications: 6 },
    { year: 2025, publications: 3 },
    { year: 2026, publications: 4 }
]);
assert.equal(publicationHistory.reduce((sum, item) => sum + item.publications, 0), 29);
assert.equal(sandbox.history.byYear(null).length, 0);

const combined = clean(sandbox.history.withIndependentCitations(registry, scholarGraph));
const scholarAnnual = new Map(scholarGraph.map(point => [Number(point.year), point.citations]));
assert.deepEqual(combined.map(point => point.year), publicationHistory.map(point => point.year));
assert.deepEqual(combined.map(point => point.publications), publicationHistory.map(point => point.publications));
assert.deepEqual(combined.map(point => point.citations),
    publicationHistory.map(point => scholarAnnual.get(point.year)));
assert.equal(sandbox.history.withIndependentCitations(registry, null).length, 0);
assert.equal(sandbox.history.withIndependentCitations(registry, [{ year: 2026, citations: 3 }]).length, 0,
    'Missing citation-year values must not be silently replaced by zeros');

const deduplicatedFixture = { works: [
    { id: 'A', type: 'journal_article', status: 'published', year: 2021 },
    { id: 'A', type: 'journal_article', status: 'published', year: 2021 },
    { id: 'B', type: 'journal_article', status: 'published', year: 2023 },
    { id: 'C', type: 'journal_article', status: 'accepted', year: 2023 },
    { id: 'D', type: 'preprint', status: 'published', year: 2023 },
    { id: 'E', type: 'book_chapter', status: 'published', year: 2023 }
] };
assert.deepEqual(clean(sandbox.history.byYear(deduplicatedFixture)), [
    { year: 2021, publications: 1 },
    { year: 2022, publications: 0 },
    { year: 2023, publications: 1 }
]);

sandbox.renderChart(false);
assert.equal(calls.length, 1);
const [container, traces, layout, config] = calls[0].args;
assert.equal(container, chart);
assert.equal(traces.length, 2, 'Dual-axis chart must include bars and citation line');
assert.equal(traces[0].type, 'bar');
assert.equal(traces[1].type, 'scatter');
assert.equal(traces[1].mode, 'lines+markers');
assert.deepEqual(clean(traces[0].x), publicationHistory.map(point => point.year));
assert.deepEqual(clean(traces[0].y), publicationHistory.map(point => point.publications));
assert.deepEqual(clean(traces[1].y), publicationHistory.map(point => scholarAnnual.get(point.year)));
assert.equal(traces[0].name, 'Artigos do portfólio');
assert.equal(traces[1].name, 'Citações Google Scholar');
assert.equal(layout.height, 350);
assert.equal(layout.hovermode, 'x unified');
assert.equal(layout.legend.orientation, 'h');
assert.equal(layout.yaxis2.overlaying, 'y');
assert.equal(layout.xaxis.dtick, 1);
assert.equal(config.displayModeBar, false);
assert.doesNotMatch(JSON.stringify(traces), /1999|99999/);
assert.equal(typeof plotClickHandler, 'function');

plotClickHandler({ points: [{ x: 2024 }] });
assert.equal(sandbox.activeYearFilter, 2024);
assert.equal(publicationRenderCount, 1);
plotClickHandler({ points: [{ x: 2024 }] });
assert.equal(sandbox.activeYearFilter, null);

sandbox.window.currentLang = 'en';
sandbox.window.innerWidth = 420;
sandbox.renderChart(false);
assert.equal(calls.length, 2);
const englishTraces = calls[1].args[1];
assert.equal(englishTraces[0].name, 'Portfolio articles');
assert.equal(englishTraces[1].name, 'Google Scholar citations');
assert.equal(calls[1].args[2].height, 260);
assert.equal(calls[1].args[2].xaxis.tickangle, -45);

sandbox.data.scholar.graphData = fallback.academicData.scopus.profile.cited_by.graph;
sandbox.renderChart(false);
assert.equal(calls.length, 2, 'No plot must be fabricated from empty Scopus citation history');
assert.match(chart.textContent, /unavailable/);

console.log('PASS: shared dual-axis plot, independent citation provenance, year filter, i18n, Scopus privacy');
