import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The documentation site is generated from docs-src/src into docs/ and
// committed. These checks cover the structure and the generated output without
// running the Deno build (which CI does not have), the same way the Examples
// content is tested.
const root = fileURLToPath(new URL('..', import.meta.url));
const sources = join(root, 'docs-src');
const docs = join(root, 'docs');
const structure = JSON.parse(readFileSync(join(sources, 'src', 'structure.json'), 'utf8'));
const ALL_LANGS = ['en', 'pt', 'es'];

function availableLangs() {
  return ALL_LANGS.filter((lang) => existsSync(join(sources, 'src', lang, 'index.md')));
}

function prefixFor(lang) {
  return lang === 'en' ? '' : `${lang}/`;
}

test('the documentation sources cover every structure page in every language', () => {
  const langs = availableLangs();
  assert.ok(langs.includes('en'), 'English sources are the baseline');
  for (const lang of langs) {
    for (const slug of structure.pages) {
      assert.ok(existsSync(join(sources, 'src', lang, `${slug}.md`)), `missing ${lang}/${slug}.md`);
    }
  }
});

test('the generated site has a page for every language and structure entry', () => {
  for (const lang of availableLangs()) {
    const prefix = prefixFor(lang);
    assert.ok(existsSync(join(docs, prefix, 'index.html')), `missing ${prefix}index.html`);
    for (const slug of structure.pages) {
      assert.ok(
        existsSync(join(docs, prefix, slug, 'index.html')),
        `missing ${prefix}${slug}/index.html`
      );
    }
  }
  assert.ok(existsSync(join(docs, 'docs.css')));
  assert.ok(existsSync(join(docs, 'docs.js')));
});

test('every language ships a usable client-side search index', () => {
  for (const lang of availableLangs()) {
    const file = join(docs, prefixFor(lang), 'search.json');
    assert.ok(existsSync(file), `missing ${prefixFor(lang)}search.json`);
    const entries = JSON.parse(readFileSync(file, 'utf8'));
    assert.ok(entries.length > 0, `${lang} search index is empty`);
    assert.ok(
      entries.every((entry) => entry.title && entry.page && entry.url),
      `${lang} search entries must carry a title, page and url`
    );
  }
});

test('generated pages carry navigation, examples and language metadata', () => {
  const landing = readFileSync(join(docs, 'index.html'), 'utf8');
  assert.match(landing, /class="doc-nav"/);
  assert.match(landing, /class="doc-cards"/);
  assert.match(landing, /rel="canonical"/);
  assert.match(landing, /hreflang="x-default"/);

  const page = readFileSync(join(docs, 'getting-started', 'index.html'), 'utf8');
  assert.match(page, /class="doc-example"/);
  assert.match(page, /data-expr="/);
  assert.match(page, /data-action="open"/);
  assert.match(page, /<h2 id="/);
});

test('every internal /docs link in the generated pages resolves', () => {
  for (const lang of availableLangs()) {
    const prefix = prefixFor(lang);
    const pages = [
      join(docs, prefix, 'index.html'),
      ...structure.pages.map((slug) => join(docs, prefix, slug, 'index.html')),
    ];
    for (const file of pages) {
      const html = readFileSync(file, 'utf8');
      for (const match of html.matchAll(/href="(\/docs\/[^"#]*)"/g)) {
        const target = match[1];
        const rel = target.slice('/docs/'.length);
        const candidate = target.endsWith('/') ? join(docs, rel, 'index.html') : join(docs, rel);
        assert.ok(existsSync(candidate), `${file} links to missing ${target}`);
      }
    }
  }
});
