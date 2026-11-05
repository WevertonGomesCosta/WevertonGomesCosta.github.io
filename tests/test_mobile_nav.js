'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'utils.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const navTemplate = fs.readFileSync(path.join(root, '_site_components/nav-home.html'), 'utf8');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const translations = JSON.parse(fs.readFileSync(path.join(root, 'translations.json'), 'utf8'));

for (const html of [navTemplate, home]) {
    assert.match(html, /<button type="button" id="nav-toggle"[^>]*aria-expanded="false"[^>]*>/);
    assert.match(html, /aria-controls="site-primary-navigation"/);
    assert.match(html, /data-key-aria-label="nav-menu-label"/);
    assert.match(html, /<div id="site-primary-navigation" class="nav-col-center">/);
    assert.doesNotMatch(html, /nav-toggle-checkbox/);
}
assert.equal(translations.pt['nav-menu-label'], 'Menu de navegação');
assert.equal(translations.en['nav-menu-label'], 'Navigation menu');
assert.match(css, /\.nav-toggle-btn\[aria-expanded="true"\] ~ \.nav-col-center/);
assert.match(css, /visibility: hidden/);
assert.match(css, /visibility: visible/);
assert.match(css, /:focus-visible/);
assert.doesNotMatch(css, /outline:\s*none/);

const handlers = {};
const documents = {};
const watcher = {};
const button = {
    attributes: { 'aria-expanded': 'false' },
    addEventListener(name, callback) { handlers['button:' + name] = callback; },
    setAttribute(name, value) { this.attributes[name] = value; },
    getAttribute(name) { return this.attributes[name]; },
    contains(target) { return target === this || target === 'button-child'; },
    focus() { this.focusCalled = true; }
};
const links = Array.from({ length: 2 }, (_, i) => ({
    index: i,
    addEventListener(name, callback) { handlers['link' + i + ':' + name] = callback; }
}));
const menu = {
    querySelectorAll(selector) {
        assert.equal(selector, 'a');
        return links;
    },
    contains(target) { return target === this || links.includes(target); }
};
const documentMock = {
    getElementById(id) {
        if (id === 'nav-toggle') return button;
        if (id === 'site-primary-navigation') return menu;
        return null;
    },
    addEventListener(name, callback) { documents[name] = callback; }
};
const windowMock = {
    matchMedia(query) {
        assert.equal(query, '(max-width: 992px)');
        return { addEventListener(name, callback) { watcher[name] = callback; } };
    }
};
const start = js.indexOf('const MobileNavHandler = {');
const end = js.indexOf('\n};', start);
assert.ok(start >= 0 && end > start);
const sandbox = { document: documentMock, window: windowMock };
vm.createContext(sandbox);
vm.runInContext(js.slice(start, end + 3) + '\nglobalThis.mobileNav = MobileNavHandler;', sandbox);
sandbox.mobileNav.init();

function openMenu() {
    handlers['button:click']({ target: button });
    assert.equal(button.getAttribute('aria-expanded'), 'true');
}
function expectClosed() {
    assert.equal(button.getAttribute('aria-expanded'), 'false');
}

openMenu();
documents.click({ target: button });
assert.equal(button.getAttribute('aria-expanded'), 'true', 'click on the toggle must not close it');
handlers['link0:click']({ target: links[0] });
expectClosed();

openMenu();
documents.keydown({ key: 'Escape' });
expectClosed();
assert.equal(button.focusCalled, true, 'Escape must restore keyboard focus to toggle');

openMenu();
documents.click({ target: {} });
expectClosed();

openMenu();
watcher.change({ matches: false });
expectClosed();

// Native button handles keyboard Enter/Space; tests assert its semantic markup above.
console.log('PASS: responsive navigation, Escape, links, outside click, focus styles');
