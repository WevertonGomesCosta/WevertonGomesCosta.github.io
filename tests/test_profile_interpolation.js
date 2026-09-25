'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const interpolator = require(path.join(root, 'profile-interpolation.js'));
const profile = JSON.parse(fs.readFileSync(path.join(root, 'profile.json'), 'utf8'));
const raw = JSON.parse(fs.readFileSync(path.join(root, 'translations.json'), 'utf8'));

const resolved = interpolator.interpolateCatalog(raw, profile);

assert.strictEqual(
    resolved.pt['page-title'],
    'Weverton G. Costa | Pesquisador | Cientista de Dados | Doutorando em Estatística'
);
assert.strictEqual(
    resolved.en['projects-page-title'],
    'Projects | Weverton Gomes da Costa'
);
assert.strictEqual(resolved.pt['edu-date1'], '2023 - Presente');
assert.strictEqual(resolved.en['edu-date1'], '2023 - Present');
assert.strictEqual(resolved.pt['edu-date2'], '2023 - 2025');
assert.strictEqual(resolved.en['edu-date3'], '2022 - 2023');
assert.strictEqual(
    resolved.pt['edu-advisor5'],
    '<strong>Orientador:</strong> Prof. Cosme Damião Cruz. <br><strong>Coorientador:</strong> Prof. Moyses Nascimento.'
);
assert.strictEqual(
    resolved.en['edu-advisor4'],
    '<strong>Advisor:</strong> Researcher Eder Jorge de Oliveira.'
);
assert.ok(resolved.pt['privacy-contact-p'].includes('mailto:wevertonufv@gmail.com'));
assert.ok(resolved.en['privacy-rights-p'].includes('wevertonufv@gmail.com'));
assert.strictEqual(resolved.pt['footer-location'], 'Viçosa - MG, Brasil');
assert.strictEqual(resolved.en['footer-location'], 'Viçosa - MG, Brazil');
assert.strictEqual(
    resolved.pt.professional_experience[1].period,
    '2022 – 2025'
);

// Non-profile UI placeholders must remain available to their own callers.
assert.ok(resolved.pt.showing_repos_template.includes('{shown}'));
assert.ok(resolved.pt.showing_repos_template.includes('{total}'));
assert.ok(resolved.en['pdf-cited-by'].includes('{count}'));

// Every profile placeholder in the real catalog must be resolved.
const serialized = JSON.stringify(resolved);
assert.ok(!/\{profile_[a-z0-9_]+\}/.test(serialized));

// The contract is closed: unknown profile placeholders fail loudly.
const invalid = JSON.parse(JSON.stringify(raw));
invalid.pt['test-invalid-profile-placeholder'] = '{profile_not_approved}';
assert.throws(
    () => interpolator.interpolateCatalog(invalid, profile),
    /Unknown profile translation placeholder/
);

// Missing canonical records also fail rather than silently degrading facts.
const missingRecord = JSON.parse(JSON.stringify(profile));
missingRecord.education = missingRecord.education.filter(
    item => item.id !== 'phd-genetics-breeding'
);
assert.throws(
    () => interpolator.interpolateCatalog(raw, missingRecord),
    /Expected exactly one profile\.education record for phd-genetics-breeding/
);

console.log('profile translation interpolation: PASS');
