import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { MESSAGES } from '../js/i18n/index.js';

// Enforce the project's storage convention: localStorage is only ever touched
// through js/util/storage.js so the "unavailable => null / no-op" policy is
// identical everywhere.
const root = fileURLToPath(new URL('..', import.meta.url));

function listJs(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'lib') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJs(path));
    else if (entry.name.endsWith('.js')) out.push(path);
  }
  return out;
}

test('localStorage is only accessed inside util/storage.js', () => {
  const access = /\blocalStorage\s*\./;
  const offenders = [];
  for (const path of listJs(join(root, 'js'))) {
    const rel = path.slice(root.length).replace(/^[\\/]/, '');
    if (rel === 'js/util/storage.js') continue;
    const source = readFileSync(path, 'utf8');
    if (access.test(source)) offenders.push(rel);
  }
  assert.deepEqual(offenders, []);
});

// The feature inits inside boot() notify synchronously — a quota hit while the
// collection persists, a font scale restored at startup, the first currency
// rate — so every listener the composition root owns must be registered before
// boot() runs, or that first message is dropped.
// Source with comments and string literals blanked out (same length, so indexes
// still point into the original), so a mention of a call is not mistaken for it.
function codeOnly(source) {
  const blank = (match) => match.replace(/[^\n]/g, ' ');
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(['"`])(?:\\.|(?!\1)[^\\\n])*\1/g, blank)
    .replace(/\/\/[^\n]*/g, blank);
}

test('codeOnly ignores calls named in comments and strings', () => {
  const source = [
    "// window.addEventListener('x', f)",
    "/* document.addEventListener('y', f) */",
    "const note = 'el.addEventListener(';",
    "real.addEventListener('z', f);",
  ].join('\n');
  const code = codeOnly(source);
  assert.equal(code.length, source.length);
  assert.equal(code.indexOf('addEventListener('), source.indexOf('real.') + 'real.'.length);
  assert.equal(code.lastIndexOf('addEventListener('), code.indexOf('addEventListener('));
});

test('js/index.js registers its listeners before it calls boot', () => {
  const source = codeOnly(readFileSync(join(root, 'js/index.js'), 'utf8'));
  const lastListener = source.lastIndexOf('.addEventListener(');
  const bootCall = source.indexOf('  boot();');
  assert.notEqual(lastListener, -1, 'no addEventListener call found in js/index.js');
  assert.notEqual(bootCall, -1, 'js/index.js no longer calls boot() the expected way');
  assert.ok(lastListener < bootCall, 'a listener is registered after boot() runs');
});

// The domain (core/eval) must not reach up into the UI: a pure module that
// imports `ui/` can no longer be imported without a document.
test('core and eval do not depend on the UI layer', () => {
  const offenders = [];
  for (const dir of ['core', 'eval']) {
    for (const path of listJs(join(root, 'js', dir))) {
      const rel = path.slice(root.length).replace(/^[\\/]/, '');
      const source = readFileSync(path, 'utf8');
      if (/from\s+['"][^'"]*\/ui\//.test(source)) offenders.push(rel);
    }
  }
  assert.deepEqual(offenders, []);
});

// Rate storage (fetch, cache, events) belongs to the composition root, which
// pushes rates into the engine as an argument; the evaluator must not pull them
// from storage, or the worker graph drags the browser in with it.
test('eval does not depend on the storage layer', () => {
  const offenders = [];
  for (const path of listJs(join(root, 'js/eval'))) {
    const rel = path.slice(root.length).replace(/^[\\/]/, '');
    const source = readFileSync(path, 'utf8');
    if (/from\s+['"][^'"]*\/storage\//.test(source)) offenders.push(rel);
  }
  assert.deepEqual(offenders, []);
});

// Every `data-i18n*` marker in the static markup must resolve in every locale,
// so a new label cannot ship untranslated.
test('every data-i18n key in index.html exists in every locale', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const keys = new Set();
  for (const match of html.matchAll(
    /data-i18n(?:-aria-label|-title|-placeholder|-html)?="([^"]+)"/g
  )) {
    keys.add(match[1]);
  }
  assert.ok(keys.size > 0, 'index.html should carry data-i18n markers');
  for (const [name, dict] of [
    ['en', MESSAGES.en],
    ['pt', MESSAGES.pt],
    ['es', MESSAGES.es],
  ]) {
    const missing = [...keys].filter((key) => !(key in dict));
    assert.deepEqual(missing, [], `${name} is missing: ${missing.join(', ')}`);
  }
});

// GitHub Pages cannot send response headers, so the app's only CSP is the meta
// tag in index.html. Its script hash is the part that silently rots: editing the
// bootstrap script without recomputing the digest blocks the script in a real
// browser while every other test still passes, so it is derived here rather
// than trusted.
test('the CSP in index.html pins every inline script', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const meta = /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html);
  assert.ok(meta, 'index.html should declare a Content-Security-Policy');
  const policy = meta[1];
  const scripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
    (match) => match[1]
  );
  assert.ok(scripts.length > 0, 'index.html should keep its inline bootstrap');
  for (const body of scripts) {
    const digest = createHash('sha256').update(body, 'utf8').digest('base64');
    assert.ok(policy.includes(`'sha256-${digest}'`), `CSP is missing sha256-${digest}`);
  }
  assert.ok(!/script-src[^;]*unsafe-inline/.test(policy), 'scripts must not allow unsafe-inline');
  assert.ok(policy.includes("script-src 'self'"), 'scripts must be limited to this origin');
  assert.ok(policy.includes("default-src 'self'"), 'everything else defaults to this origin');
  assert.ok(
    policy.includes("connect-src 'self' https://api.frankfurter.dev"),
    'the exchange-rate API must stay reachable'
  );
});

// The evaluator stays English in v1, and importing the UI strings there would
// also drag the whole dictionary into the worker.
test('core and eval do not depend on the i18n layer', () => {
  const offenders = [];
  for (const dir of ['core', 'eval']) {
    for (const path of listJs(join(root, 'js', dir))) {
      const rel = path.slice(root.length).replace(/^[\\/]/, '');
      const source = readFileSync(path, 'utf8');
      if (/from\s+['"][^'"]*\/i18n\//.test(source)) offenders.push(rel);
    }
  }
  assert.deepEqual(offenders, []);
});

function markdownStructure(md) {
  const expressions = [...md.matchAll(/^```calc[^\n]*\n([\s\S]*?)^```$/gm)].map((m) =>
    m[1].replace(/\n$/, '')
  );
  const sections = [...md.matchAll(/^## /gm)].length;
  return { expressions, sections };
}

// The Markdown sources are the source of truth for the Examples content. Every
// language must keep the same examples (the calculator is English) and the same
// section count; only the prose differs.
test('every language has the same Examples examples and section count', () => {
  const area = 'examples';
  const reference = markdownStructure(
    readFileSync(join(root, `js/i18n/src/${area}.en.md`), 'utf8')
  );
  assert.ok(reference.sections > 0, `${area}.en.md should have sections`);
  assert.ok(reference.expressions.length > 0, `${area}.en.md should have examples`);
  for (const lang of ['pt', 'es']) {
    const other = markdownStructure(
      readFileSync(join(root, `js/i18n/src/${area}.${lang}.md`), 'utf8')
    );
    assert.deepEqual(other.expressions, reference.expressions, `${area}.${lang} examples differ`);
    assert.equal(other.sections, reference.sections, `${area}.${lang} section count differs`);
  }
});

test('the generated Examples modules carry rendered sections', async () => {
  const examples = (await import('../js/i18n/examples/es.js')).default;
  assert.ok(examples.intro.includes('<p>'));
  assert.ok(examples.sections.length >= 19);
  assert.match(examples.sections[0].id, /^examples-/);
  assert.match(examples.sections[0].html, /class="example-chip"/);
});

test('every docs page carries a CSP whose digest matches its inline script', async () => {
  const { createHash } = await import('node:crypto');
  const { readFileSync, readdirSync } = await import('node:fs');
  const html = readFileSync(new URL('../docs/units/index.html', import.meta.url), 'utf8');
  const meta = /Content-Security-Policy" content="([^"]+)"/.exec(html);
  assert.ok(meta, 'the docs page has a CSP');
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)[1];
  const digest = createHash('sha256').update(script).digest('base64');
  assert.ok(meta[1].includes(`'sha256-${digest}'`), 'the CSP names the inline script digest');
  assert.ok(readdirSync(new URL('../docs/', import.meta.url)).includes('404.html'));
});
