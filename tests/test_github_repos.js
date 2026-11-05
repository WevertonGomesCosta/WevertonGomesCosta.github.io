'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'utils.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

// Load only the repositories module, without executing page initialization.
const start = source.indexOf('const GithubReposModule = {');
const end = source.indexOf('\n};', start);
assert.ok(start >= 0 && end > start, 'GithubReposModule declaration must be present');

const listeners = {};
const clickHandlers = {};
const listEl = {
    items: [],
    set innerHTML(value) { this.items = []; this.markup = value; },
    get innerHTML() { return this.markup; },
    appendChild(item) { this.items.push(item); }
};
function control() {
    return {
        textContent: '',
        dataset: {},
        classList: {
            hidden: false,
            toggle(name, enabled) { this[name] = !!enabled; }
        },
        addEventListener(type, callback) { clickHandlers[type + ':' + this.key] = callback; }
    };
}
const clear = control();
clear.key = 'clear';
const more = control();
more.key = 'more';
const shown = control();
const search = control();
search.key = 'search';
search.value = '';

const nodes = { '#list': listEl, '#meta': control(), '#search': search, '#clear': clear, '#more': more, '#shown': shown };
const repos = Array.from({ length: 8 }, (_, i) => ({
    name: i === 0
        ? 'Genome-Wide-SNPs-and-Mask-R-CNN-TensorFlow'
        : 'genomic-project-' + (i + 1),
    description: 'Research project ' + (i + 1),
    homepage: '',
    html_url: 'https://github.com/example/repo-' + i,
    topics: i === 0 ? ['genomic-selection', 'rr-blup'] : ['genomics'],
    stargazers_count: 8 - i,
    forks_count: 0,
    updated_at: '2026-11-05T00:00:00Z',
    language: 'R'
}));
const sandbox = {
    window: {
        currentLang: 'pt',
        fallbackData: { githubRepos: repos },
        AppEvents: { on(name, callback) { listeners[name] = callback; } }
    },
    currentLang: 'pt',
    translations: {
        pt: { 'clear-btn': 'Limpar', 'show-more': 'Mostrar mais', 'repo-view-repo': 'Repositório', showing_repos_template: 'Exibindo {shown} de {total}' },
        en: { 'clear-btn': 'Clear', 'show-more': 'Show more', 'repo-view-repo': 'Repository', showing_repos_template: 'Showing {shown} of {total}' }
    },
    document: {
        querySelector(selector) { return nodes[selector] || null; },
        createElement() { return { setAttribute() {}, innerHTML: '', className: '' }; }
    },
    SiteProfile: { get() { return null; } },
    DateFormatter: { formatWithLabel(value) { return value; } },
    setTimeout,
    clearTimeout,
    URL
};
vm.createContext(sandbox);
vm.runInContext(source.slice(start, end + 3) + '\nglobalThis.reposModule = GithubReposModule;', sandbox);
const reposModule = sandbox.reposModule;

assert.equal(
    reposModule.titleCase('Bovine-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow'),
    'Bovine Weight Calculation By Mask R-CNN Keras And TensorFlow'
);
assert.equal(
    reposModule.titleCase('Genomic-Selection-for-Drought-Tolerance-Using-Genome-Wide-SNPs-in-Casava'),
    'Genomic Selection For Drought Tolerance Using Genome Wide SNPs In Casava'
);
assert.equal(reposModule.titleCase('QTL-based-RR-BLUP-GxE'), 'QTL Based RR-BLUP GxE');

reposModule.init({
    listSelector: '#list',
    metaSelector: '#meta',
    searchSelector: '#search',
    clearBtnSelector: '#clear',
    loadMoreBtnSelector: '#more',
    shownCountSelector: '#shown',
    isPaginated: true,
    initialCount: 3,
    incrementCount: 3
});
assert.equal(listEl.items.length, 3);
assert.equal(reposModule.state.showingCount, 3);
assert.equal(more.classList.hidden, false);
assert.match(listEl.items[0].innerHTML, /<span class="topic-tag">genomic-selection<\/span>/);

clickHandlers['click:more']();
assert.equal(listEl.items.length, 6);
assert.equal(reposModule.state.showingCount, 6);

// Language switching should update labels without collapsing the expanded list.
sandbox.currentLang = 'en';
sandbox.window.currentLang = 'en';
listeners.languageChanged();
assert.equal(listEl.items.length, 6);
assert.equal(reposModule.state.showingCount, 6);
assert.equal(more.textContent, 'Show more');
assert.equal(shown.textContent, 'Showing 6 of 8');

// Searches and their visible results must also remain intact after switching back.
reposModule.state.currentFilter = 'rr-blup';
search.value = 'rr-blup';
reposModule.filterAndRender();
assert.equal(listEl.items.length, 1);
assert.equal(more.classList.hidden, true);
sandbox.currentLang = 'pt';
sandbox.window.currentLang = 'pt';
listeners.languageChanged();
assert.equal(reposModule.state.currentFilter, 'rr-blup');
assert.equal(search.value, 'rr-blup');
assert.equal(listEl.items.length, 1);
assert.equal(shown.textContent, 'Exibindo 1 de 1');

// Searches must match accents whether the visitor types diacritics or not.
assert.equal(reposModule.normalizeSearchText('Análise Genômica'), 'analise genomica');
repos[1].description = 'Análise genômica para café e seleção';
reposModule.state.currentFilter = 'analise genomica para cafe';
search.value = reposModule.state.currentFilter;
reposModule.filterAndRender();
assert.equal(listEl.items.length, 1);
assert.match(listEl.items[0].innerHTML, /Genomic Project 2/);
assert.equal(shown.textContent, 'Exibindo 1 de 1');

reposModule.state.currentFilter = 'CAFÉ';
search.value = reposModule.state.currentFilter;
reposModule.filterAndRender();
assert.equal(listEl.items.length, 1);
assert.match(listEl.items[0].innerHTML, /Genomic Project 2/);

// Untrusted repository text must not execute as HTML or supply unsafe URLs.
const malicious = {
    ...repos[0],
    name: '<img src=x onerror=alert(1)>',
    description: '<svg onload=alert(1)> & "quoted"',
    topics: ['<img src=x onerror=alert(2)>'],
    language: '<b>Python</b>',
    homepage: 'javascript:alert(3)',
    html_url: 'data:text/html,<script>alert(4)</script>'
};
const maliciousMarkup = reposModule.createCard(malicious).innerHTML;
assert.match(maliciousMarkup, /&lt;img/);
assert.match(maliciousMarkup, /&lt;svg/);
assert.match(maliciousMarkup, /&lt;b&gt;Python&lt;\/b&gt;/);
assert.match(maliciousMarkup, /&amp; &quot;quoted&quot;/);
assert.doesNotMatch(maliciousMarkup, /<img|<svg|<script|href="javascript:|href="data:/);
assert.doesNotMatch(maliciousMarkup, /<a\s/);
assert.equal(reposModule.safeHttpUrl('javascript:alert(1)'), '');
assert.equal(reposModule.safeHttpUrl('data:text/html,test'), '');
assert.equal(reposModule.safeHttpUrl('https://example.org/path'), 'https://example.org/path');

const normalMarkup = reposModule.createCard({
    ...repos[0],
    homepage: 'https://example.org/project?x=1&y=2',
    html_url: 'https://github.com/example/repo'
}).innerHTML;
assert.match(normalMarkup, /href="https:\/\/example.org\/project\?x=1&amp;y=2"/);
assert.match(normalMarkup, /href="https:\/\/github.com\/example\/repo"/);

// Topics are labels: no cursor or hover animation should suggest clickable behavior.
const topicRule = css.match(/\.topic-tag\s*\{([^}]+)\}/);
assert.ok(topicRule, 'Missing project topic style');
assert.doesNotMatch(topicRule[1], /cursor\s*:\s*pointer/);
assert.doesNotMatch(css, /\.topic-tag:hover/);

console.log('PASS: project titles, pagination, language changes, search, passive tags');
