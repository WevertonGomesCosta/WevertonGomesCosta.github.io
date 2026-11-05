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
elements['scopus-refresh-status'] = { hidden: true, textContent: '' };
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
assert.equal(traces[1].name, catalog.pt['chart-cits']);
assert.equal(traces[1].line.color, '#ff7f0e');
assert.equal(layout.height, 350);
assert.equal(layout.hovermode, 'x unified');
assert.equal(layout.legend.orientation, 'h');
assert.equal(layout.yaxis2.overlaying, 'y');
assert.equal(layout.xaxis.dtick, 1);
assert.equal(config.displayModeBar, false);
assert.equal(typeof clickHandler, 'function');
assert.equal(elements['scopus-cit'].textContent, String(fallback.academicData.scopus.profile.cited_by.table[0].citations.all));
assert.equal(elements['scopus-refresh-status'].hidden, false, 'Stale annual history must be disclosed');
assert.match(elements['scopus-refresh-status'].textContent, /histórico anual preservado/);

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
assert.equal(calls[1][1][1].name, catalog.en['chart-cits']);
assert.equal(calls[1][2].height, 260);
assert.equal(calls[1][2].xaxis.tickangle, -45);
assert.match(elements['scopus-refresh-status'].textContent, /earlier retrieval/);

fallback.academicData.scopus.history_status = 'current';
sandbox.renderScopus();
assert.equal(elements['scopus-refresh-status'].hidden, true, 'Current history needs no routine status label');

fallback.sourceStates.scopus.last_valid_at = '2026-10-01T09:45:45';
sandbox.renderScopus();
assert.equal(elements['scopus-cit'].textContent, '—', 'Expired author metric must be hidden');
assert.equal(calls.length, 4, 'Historical graph remains available despite expired author summary');

fallback.academicData.scopus.profile.cited_by.graph = [];
sandbox.window.currentLang = 'pt';
sandbox.renderScopus();
assert.equal(calls.length, 4, 'Never fall back to Scholar when the Scopus history is missing');

console.log('PASS: Scopus source, shared dual-axis chart, language, stale status, year filter and privacy');
