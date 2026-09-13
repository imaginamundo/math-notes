import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The documentation site is generated from docs/src into docs/dist and committed.
// These checks cover the structure and the generated output without running the
// Deno build (which CI does not have); the same way the Help content is tested.
const root = fileURLToPath(new URL('..', import.meta.url));
const docs = join(root, 'docs');
const dist = join(docs, 'dist');
const structure = JSON.parse(readFileSync(join(docs, 'src', 'structure.json'), 'utf8'));
const ALL_LANGS = ['en', 'pt', 'es'];

function availableLangs() {
  return ALL_LANGS.filter((lang) => existsSync(join(docs, 'src', lang, 'index.md')));
}

function prefixFor(lang) {
  return lang === 'en' ? '' : `${lang}/`;
}

test('the documentation sources cover every structure page in every language', () => {
  const langs = availableLangs();
  assert.ok(langs.includes('en'), 'English sources are the baseline');
  for (const lang of langs) {
    for (const slug of structure.pages) {
      assert.ok(existsSync(join(docs, 'src', lang, `${slug}.md`)), `missing ${lang}/${slug}.md`);
    }
  }
});

test('the generated site has a page for every language and structure entry', () => {
  for (const lang of availableLangs()) {
    const prefix = prefixFor(lang);
    assert.ok(existsSync(join(dist, prefix, 'index.html')), `missing ${prefix}index.html`);
    for (const slug of structure.pages) {
      assert.ok(
        existsSync(join(dist, prefix, slug, 'index.html')),
        `missing ${prefix}${slug}/index.html`
      );
    }
  }
  assert.ok(existsSync(join(dist, 'docs.css')));
  assert.ok(existsSync(join(dist, 'docs.js')));
});

test('generated pages carry navigation, examples and language metadata', () => {
  const landing = readFileSync(join(dist, 'index.html'), 'utf8');
  assert.match(landing, /class="doc-nav"/);
  assert.match(landing, /class="doc-cards"/);
  assert.match(landing, /rel="canonical"/);
  assert.match(landing, /hreflang="x-default"/);

  const page = readFileSync(join(dist, 'getting-started', 'index.html'), 'utf8');
  assert.match(page, /class="doc-example"/);
  assert.match(page, /data-expr="/);
  assert.match(page, /data-action="open"/);
  assert.match(page, /<h2 id="/);
});

test('every internal /docs link in the generated pages resolves', () => {
  for (const lang of availableLangs()) {
    const prefix = prefixFor(lang);
    const pages = [
      join(dist, prefix, 'index.html'),
      ...structure.pages.map((slug) => join(dist, prefix, slug, 'index.html')),
    ];
    for (const file of pages) {
      const html = readFileSync(file, 'utf8');
      for (const match of html.matchAll(/href="(\/docs\/[^"#]*)"/g)) {
        const target = match[1];
        const rel = target.slice('/docs/'.length);
        const candidate = target.endsWith('/') ? join(dist, rel, 'index.html') : join(dist, rel);
        assert.ok(existsSync(candidate), `${file} links to missing ${target}`);
      }
    }
  }
});
