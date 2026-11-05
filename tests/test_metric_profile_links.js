'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const script = fs.readFileSync(path.join(root, 'utils.js'), 'utf8');
const profile = JSON.parse(fs.readFileSync(path.join(root, 'profile.json'), 'utf8'));
const translations = JSON.parse(fs.readFileSync(path.join(root, 'translations.json'), 'utf8'));

const sources = [
    { key: 'scholar', profile: 'google_scholar', translation: 'profile-metrics-scholar' },
    { key: 'scopus', profile: 'scopus', translation: 'profile-metrics-scopus' },
    { key: 'wos', profile: 'web_of_science', translation: 'profile-metrics-wos' }
];
const metrics = ['pubs', 'cit', 'h', 'i10'];
const links = [...html.matchAll(/<a class="metric-source-link" ([^>]+)><span class="metric-value" id="([^"]+)"/g)];
assert.equal(links.length, 12, 'All 12 bibliometric values must link to their respective source');

for (const source of sources) {
    const expectedUrl = profile.profiles[source.profile].url.replaceAll('&', '&amp;');
    for (const metric of metrics) {
        const id = source.key + '-' + metric;
        const match = links.find(item => item[2] === id);
        assert.ok(match, id + ': enclosing profile link');
        const attributes = match[1];
        assert.ok(attributes.includes('href="' + expectedUrl + '"'), id + ': canonical URL');
        assert.ok(attributes.includes('target="_blank"'), id + ': new tab');
        assert.ok(attributes.includes('rel="noopener noreferrer"'), id + ': safe external link');
        assert.ok(attributes.includes('data-key-title="' + source.translation + '"'), id + ': bilingual tooltip');
        assert.doesNotMatch(attributes, /style=/, id + ': no inline underline');
    }
    assert.ok(translations.pt[source.translation], source.translation + ': Portuguese translation');
    assert.ok(translations.en[source.translation], source.translation + ': English translation');
}

assert.match(css, /#index-page \.stats-card \.metric-source-link\s*\{[^}]*text-decoration:\s*none;/);
assert.match(css, /:where\(a, button, input, select, textarea\):focus-visible/);
assert.doesNotMatch(html, /scopus-refresh-status|text-decoration:underline/);
assert.doesNotMatch(script, /scopus-refresh-status|histórico anual preservado|annual history retained from an earlier retrieval/);
assert.match(script, /7 \* 24 \* 60 \* 60 \* 1000/, 'Scopus expiry guard must remain');
assert.match(
    fs.readFileSync(path.join(root, '.github/workflows/update-academic-data.yml'), 'utf8'),
    /cron:\s*"17 9 \* \* 3"/,
    'Academic source updates must remain scheduled weekly'
);

console.log('PASS: 12 external bibliometric links, consistent styling, PT/EN, no status copy, weekly refresh');
