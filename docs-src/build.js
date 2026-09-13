// Build the documentation site from the Markdown sources in src/. Run with
// `make -C docs-src` (or `npm run build:docs`). The generated files under the
// top-level docs/ are committed and published at /docs, like the mathjs bundle.
import { marked } from 'npm:marked@15';

const ROOT = new URL('.', import.meta.url).pathname;
const SRC = `${ROOT}src/`;
const DIST = new URL('../docs/', import.meta.url).pathname;

// Every language that has an index.md is built; the rest are skipped, so a
// language can be added one page at a time without breaking the build. The
// order here also drives the language switcher.
const LANGS = ['en', 'pt', 'es'];

const UI = {
  en: {
    htmlLang: 'en',
    name: 'English',
    home: 'Home',
    docs: 'Documentation',
    app: 'Open Math Notes',
    onThisPage: 'On this page',
    copy: 'Copy',
    copied: 'Copied',
    open: 'Open in Math Notes',
    menu: 'Documentation menu',
    language: 'Language',
    footer: 'Math Notes — a browser-based inline calculator.',
    guide: 'User guide',
    anchor: 'Link to this section',
  },
  pt: {
    htmlLang: 'pt',
    name: 'Português',
    home: 'Início',
    docs: 'Documentação',
    app: 'Abrir o Math Notes',
    onThisPage: 'Nesta página',
    copy: 'Copiar',
    copied: 'Copiado',
    open: 'Abrir no Math Notes',
    menu: 'Menu da documentação',
    language: 'Idioma',
    footer: 'Math Notes — uma calculadora em linha no navegador.',
    guide: 'Guia de utilização',
    anchor: 'Link para esta secção',
  },
  es: {
    htmlLang: 'es',
    name: 'Español',
    home: 'Inicio',
    docs: 'Documentación',
    app: 'Abrir Math Notes',
    onThisPage: 'En esta página',
    copy: 'Copiar',
    copied: 'Copiado',
    open: 'Abrir en Math Notes',
    menu: 'Menú de la documentación',
    language: 'Idioma',
    footer: 'Math Notes — una calculadora en línea en el navegador.',
    guide: 'Guía de uso',
    anchor: 'Enlace a esta sección',
  },
};

const structure = JSON.parse(Deno.readTextFileSync(`${SRC}structure.json`));
const BASE_URL = String(structure.baseUrl || 'https://math.dio.dev').replace(/\/$/, '');
const PAGES = structure.pages;

// The `code` renderer reads this before each parse, so the button labels follow
// the language being rendered (marked parses across a loop, and `marked.use`
// installs a single renderer).
let currentUi = UI.en;

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(text) {
  return escapeHtml(text).replace(/"/g, '&quot;');
}

// An example fence becomes a rendered code block with copy/open controls. The
// code is colored in the browser by the app's own highlighter (docs.js); with
// scripting off the plain text still reads.
function exampleBlock(expr, hint, ui) {
  const hintHtml = hint
    ? `<figcaption class="doc-example-result">${escapeHtml(hint)}</figcaption>`
    : '';
  return (
    `<figure class="doc-example" data-expr="${escapeAttr(expr)}">` +
    `<pre class="doc-code"><code data-calc>${escapeHtml(expr)}</code></pre>${hintHtml}` +
    `<div class="doc-example-actions">` +
    `<button type="button" class="doc-action" data-action="copy" data-copied="${escapeAttr(ui.copied)}">${escapeHtml(ui.copy)}</button>` +
    `<button type="button" class="doc-action doc-action-primary" data-action="open">${escapeHtml(ui.open)}</button>` +
    `</div></figure>`
  );
}

marked.use({
  renderer: {
    code(token) {
      const lang = token.lang || '';
      if (!lang.startsWith('calc')) return false;
      const hint = lang.slice('calc'.length).trim();
      const expr = token.text.replace(/\n$/, '');
      return exampleBlock(expr, hint, currentUi);
    },
  },
});

function headingId(text) {
  return (
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  );
}

// Give every h2/h3 an id, a copy-linkable anchor and collect the h2s as a table
// of contents, so the in-page anchors and the sidebar sub-navigation cannot
// drift apart.
function addHeadingIds(html, ui) {
  const toc = [];
  const seen = new Map();
  const out = html.replace(/<h([23])>(.*?)<\/h\1>/g, (match, level, inner) => {
    const text = inner.replace(/<[^>]+>/g, '');
    const base = headingId(text);
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count + 1}`;
    if (level === '2') toc.push({ id, text });
    const anchor =
      `<a class="doc-anchor" href="#${id}" aria-label="${escapeAttr(ui.anchor)}"` +
      ` title="${escapeAttr(ui.anchor)}">#</a>`;
    return `<h${level} id="${id}">${inner}${anchor}</h${level}>`;
  });
  return { html: out, toc };
}

function renderMarkdown(md, ui) {
  currentUi = ui;
  return addHeadingIds(marked.parse(md).trim(), ui);
}

function titleOf(md, fallback) {
  const match = /^#\s+(.+)$/m.exec(md);
  return match ? match[1].replace(/[*_`]/g, '').trim() : fallback;
}

function descriptionOf(md) {
  for (const block of md.split(/\n{2,}/)) {
    const text = block.trim();
    if (!text || /^(#|```|\||>|[-*]\s)/.test(text)) continue;
    return text
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[`*_]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return '';
}

function docPath(lang, slug) {
  const root = lang === 'en' ? '/docs' : `/docs/${lang}`;
  return slug ? `${root}/${slug}/` : `${root}/`;
}

// The sources link between pages with language-neutral `/docs/<slug>/` URLs;
// prefix the language segment for the non-English builds.
function localizeLinks(html, lang) {
  if (lang === 'en') return html;
  return html.replace(/href="\/docs\//g, `href="/docs/${lang}/`);
}

function navHtml(lang, activeSlug, toc) {
  const ui = UI[lang];
  const homeActive = activeSlug === '';
  const items = [
    `<li class="doc-nav-item${homeActive ? ' is-active' : ''}">` +
      `<a href="${docPath(lang, '')}"${homeActive ? ' aria-current="page"' : ''}>${escapeHtml(ui.home)}</a></li>`,
  ];
  for (const slug of PAGES) {
    const page = content[lang][slug];
    const active = slug === activeSlug;
    let sub = '';
    if (active && toc.length) {
      const links = toc
        .map((entry) => `<li><a href="#${entry.id}">${escapeHtml(entry.text)}</a></li>`)
        .join('');
      sub = `<ul class="doc-nav-sub"><li class="doc-nav-sub-title">${escapeHtml(ui.onThisPage)}</li>${links}</ul>`;
    }
    items.push(
      `<li class="doc-nav-item${active ? ' is-active' : ''}">` +
        `<a href="${docPath(lang, slug)}"${active ? ' aria-current="page"' : ''}>${escapeHtml(page.title)}</a>${sub}</li>`
    );
  }
  return `<nav class="doc-nav" aria-label="${escapeAttr(ui.menu)}"><ul>${items.join('')}</ul></nav>`;
}

function langSwitchHtml(lang, slug) {
  if (LANGS_AVAILABLE.length < 2) return '';
  const links = LANGS_AVAILABLE.map((code) => {
    const active = code === lang;
    return (
      `<a href="${docPath(code, slug)}" hreflang="${code}"` +
      `${active ? ' class="is-active" aria-current="page"' : ''}>${escapeHtml(UI[code].name)}</a>`
    );
  });
  return `<nav class="doc-lang" aria-label="${escapeAttr(UI[lang].language)}">${links.join('')}</nav>`;
}

function alternateLinks(slug) {
  const links = LANGS_AVAILABLE.map(
    (code) => `<link rel="alternate" hreflang="${code}" href="${BASE_URL}${docPath(code, slug)}">`
  );
  links.push(
    `<link rel="alternate" hreflang="x-default" href="${BASE_URL}${docPath('en', slug)}">`
  );
  return links.join('\n  ');
}

function assets() {
  return [
    '<link rel="stylesheet" href="/style.css">',
    '<link rel="stylesheet" href="/docs/docs.css">',
    '<link rel="shortcut icon" type="image/x-icon" href="/favicon.ico">',
    '<meta name="theme-color" content="#282c34">',
    '<script>',
    '  (function () {',
    '    try {',
    "      var t = localStorage.getItem('math-notes-theme');",
    '      if (t) document.documentElement.dataset.theme = t;',
    "      var s = parseInt(localStorage.getItem('math-notes-font-scale'), 10);",
    '      if (s >= 50 && s <= 200) {',
    "        document.documentElement.style.setProperty('--app-font-scale', (s / 100).toString());",
    '      }',
    '    } catch (e) {}',
    '  })();',
    '</script>',
    '<script type="module" src="/docs/docs.js"></script>',
  ].join('\n  ');
}

function pageHtml(lang, slug, page) {
  const ui = UI[lang];
  const title = slug ? `${page.title} · ${ui.docs} · Math Notes` : `${ui.docs} · Math Notes`;
  const canonical = `${BASE_URL}${docPath(lang, slug)}`;
  return `<!DOCTYPE html>
<html lang="${ui.htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeAttr(page.description)}">
  <link rel="canonical" href="${canonical}">
  ${alternateLinks(slug)}
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Math Notes">
  <meta property="og:title" content="${escapeAttr(page.title)}">
  <meta property="og:description" content="${escapeAttr(page.description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${BASE_URL}/images/icons/icon-192.png">
  ${assets()}
</head>
<body>
  <a class="doc-skip" href="#content">Skip to content</a>
  <header class="doc-header">
    <a class="doc-brand" href="${docPath(lang, '')}">
      <span class="doc-brand-name">Math Notes</span>
      <span class="doc-brand-tag">${escapeHtml(ui.docs)}</span>
    </a>
    <div class="doc-header-actions">
      ${langSwitchHtml(lang, slug)}
      <a class="doc-app" href="/">${escapeHtml(ui.app)}</a>
    </div>
  </header>
  <div class="doc-layout">
    <button class="doc-menu-toggle" type="button" aria-expanded="false" aria-controls="doc-sidebar">${escapeHtml(ui.menu)}</button>
    <aside class="doc-sidebar" id="doc-sidebar">
      ${navHtml(lang, slug, page.toc)}
    </aside>
    <main class="doc-main" id="content">
      <article class="doc-content">
${page.html}
      </article>
      <footer class="doc-footer">
        <p>${escapeHtml(ui.footer)}</p>
        <p><a href="https://github.com/imaginamundo/math-notes">GitHub</a></p>
      </footer>
    </main>
  </div>
</body>
</html>
`;
}

function write(path, data) {
  const dir = path.slice(0, path.lastIndexOf('/'));
  Deno.mkdirSync(dir, { recursive: true });
  Deno.writeTextFileSync(path, data);
}

// Read every page for every available language before rendering any HTML, so
// the sidebar knows all the localized titles.
const LANGS_AVAILABLE = LANGS.filter((lang) => {
  try {
    return Deno.statSync(`${SRC}${lang}/index.md`).isFile;
  } catch {
    return false;
  }
});
if (!LANGS_AVAILABLE.length) throw new Error('No documentation sources found in src/');

const content = {};
for (const lang of LANGS_AVAILABLE) {
  content[lang] = {};
  for (const slug of ['', ...PAGES]) {
    const file = slug ? `${SRC}${lang}/${slug}.md` : `${SRC}${lang}/index.md`;
    const md = Deno.readTextFileSync(file);
    const { html, toc } = renderMarkdown(md, UI[lang]);
    content[lang][slug] = {
      title: titleOf(md, slug || UI[lang].docs),
      description: descriptionOf(md),
      html: localizeLinks(html, lang),
      toc,
    };
  }
}

// Give the landing page a card for each category.
for (const lang of LANGS_AVAILABLE) {
  const cards = PAGES.map((slug) => {
    const page = content[lang][slug];
    const desc = page.description
      ? `<span class="doc-card-desc">${escapeHtml(page.description)}</span>`
      : '';
    return (
      `<li><a href="${docPath(lang, slug)}">` +
      `<span class="doc-card-title">${escapeHtml(page.title)}</span>${desc}</a></li>`
    );
  }).join('');
  content[lang][''].html += `\n<ul class="doc-cards">${cards}</ul>`;
}

try {
  Deno.removeSync(DIST, { recursive: true });
} catch {
  // dist does not exist yet
}

for (const lang of LANGS_AVAILABLE) {
  for (const slug of ['', ...PAGES]) {
    write(
      `${DIST}${docPath(lang, slug).replace('/docs/', '')}index.html`,
      pageHtml(lang, slug, content[lang][slug])
    );
  }
}

Deno.copyFileSync(`${SRC}docs.css`, `${DIST}docs.css`);
Deno.copyFileSync(`${SRC}docs.js`, `${DIST}docs.js`);

console.log(`docs: ${LANGS_AVAILABLE.join(', ')} → ${PAGES.length + 1} pages each`);
