'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'utils.js'), 'utf8');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'academic-registry.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'translations.json'), 'utf8'));

const helperStart = source.indexOf('const PortfolioPublicationHistory = {');
const helperEnd = source.indexOf('\n};', helperStart);
const rendererStart = source.indexOf('    function renderPortfolioPublicationChart() {');
const rendererEnd = source.indexOf('\n    }\n\n    // --- RENDERIZAÇÃO ---', rendererStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'Independent annual aggregation must exist');
assert.ok(rendererStart >= 0 && rendererEnd > rendererStart, 'Portfolio chart renderer must exist');

const calls = [];
let plotClickHandler = null;
let publicationRenderCount = 0;
const chart = {
    dataset: {},
    textContent: '',
    getBoundingClientRect() { return { width: 670 }; },
    on(name, handler) {
        assert.equal(name, 'plotly_click');
        plotClickHandler = handler;
    }
};
const sandbox = {
    window: {
        currentLang: 'pt',
        innerWidth: 1200,
        academicRegistry: registry,
        // Presence of licensed or obsolete Scopus series must not affect the chart.
        fallbackData: {
            academicData: { scopus: {
                profile: { cited_by: { graph: [{ year: 1999, citations: 99999 }] } }
            } }
        },
        translations: catalog,
        Plotly: {
            newPlot(...args) { calls.push({ action: 'newPlot', args }); return Promise.resolve(); },
            react(...args) { calls.push({ action: 'react', args }); return Promise.resolve(); }
        }
    },
    document: {
        getElementById(id) { return id === 'scopus-chart' ? chart : null; }
    },
    activeYearFilter: null,
    initialPubsToShow: 3,
    showingPubsCount: 3,
    renderPublications() { publicationRenderCount++; },
    updateFilterUI() {}
};
vm.createContext(sandbox);
const exported = source.slice(helperStart, helperEnd + 3) + '\n' +
    source.slice(rendererStart, rendererEnd + 6) +
    '\nglobalThis.history = PortfolioPublicationHistory;' +
    '\nglobalThis.renderChart = renderPortfolioPublicationChart;';
vm.runInContext(exported, sandbox);

const clean = value => JSON.parse(JSON.stringify(value));

const series = clean(sandbox.history.byYear(registry));
assert.deepEqual(series, [
    { year: 2019, publications: 2 },
    { year: 2020, publications: 2 },
    { year: 2021, publications: 6 },
    { year: 2022, publications: 3 },
    { year: 2023, publications: 3 },
    { year: 2024, publications: 6 },
    { year: 2025, publications: 3 },
    { year: 2026, publications: 4 }
]);
assert.equal(series.reduce((sum, value) => sum + value.publications, 0), 29);
assert.equal(sandbox.history.byYear(null).length, 0);

const fixture = { works: [
    { id: 'A', type: 'journal_article', status: 'published', year: 2021 },
    { id: 'A', type: 'journal_article', status: 'published', year: 2021 },
    { id: 'B', type: 'journal_article', status: 'published', year: 2023 },
    { id: 'C', type: 'journal_article', status: 'accepted', year: 2023 },
    { id: 'D', type: 'preprint', status: 'published', year: 2023 },
    { id: 'E', type: 'book_chapter', status: 'published', year: 2023 },
    { id: 'F', type: 'journal_article', status: 'published', year: 'undated' }
] };
assert.deepEqual(clean(sandbox.history.byYear(fixture)), [
    { year: 2021, publications: 1 },
    { year: 2022, publications: 0 },
    { year: 2023, publications: 1 }
]);

(async () => {
    sandbox.renderChart();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].action, 'newPlot');
    const [, traces, layout, config] = calls[0].args;
    assert.equal(traces.length, 1, 'Only a publication bar series is allowed');
    assert.equal(traces[0].type, 'bar');
    assert.deepEqual(clean(traces[0].x), series.map(p => String(p.year)));
    assert.deepEqual(clean(traces[0].y), series.map(p => p.publications));
    assert.doesNotMatch(JSON.stringify(traces), /citations|99999|1999/);
    assert.equal(config.displayModeBar, false);
    assert.equal(layout.height, 270);
    // Plotly signals readiness asynchronously; flush the next event-loop turn.
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(typeof plotClickHandler, 'function');

    plotClickHandler({ points: [{ x: '2024' }] });
    assert.equal(sandbox.activeYearFilter, 2024);
    assert.equal(publicationRenderCount, 1);
    plotClickHandler({ points: [{ x: '2024' }] });
    assert.equal(sandbox.activeYearFilter, null);

    sandbox.window.currentLang = 'en';
    sandbox.window.innerWidth = 420;
    sandbox.renderChart();
    assert.equal(calls[1].action, 'react');
    assert.equal(calls[1].args[2].height, 250);
    assert.match(calls[1].args[1][0].hovertemplate, /articles/);

    sandbox.window.academicRegistry = null;
    sandbox.renderChart();
    assert.match(chart.textContent, /unavailable/);

    console.log('PASS: independent journal history, licensed-data boundary, chart, i18n and year filters');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
