// Progressive enhancement for the documentation pages. The content and
// navigation are fully rendered at build time; this only adds the app's syntax
// colours, copy buttons, "Open in Math Notes" links, the mobile menu, the
// sidebar scroll-spy and the static client-side search.
import format from '/js/render/format.js';
import { collectVariableNames } from '/js/core/multiWordVariables.js';
import { buildShareUrl } from '/js/share/shareLink.js';
import { copyText } from '/js/util/clipboard.js';

// Colour each line with the app's highlighter and, like the editor, put it in a
// numbered gutter row so an example reads as a small sheet.
function colorize(code) {
  const text = code.textContent;
  const lines = text.split('\n');
  const names = collectVariableNames(lines);
  // Size the gutter to the widest line number so 10+ lines stay aligned.
  code.style.setProperty('--doc-gutter', `${String(lines.length).length}ch`);
  code.textContent = '';
  lines.forEach((line, index) => {
    const row = document.createElement('span');
    row.className = 'doc-line';
    const number = document.createElement('span');
    number.className = 'doc-line-number';
    number.setAttribute('aria-hidden', 'true');
    number.textContent = String(index + 1);
    const content = document.createElement('span');
    content.className = 'doc-line-content';
    content.appendChild(format.line(line, names));
    row.append(number, content);
    code.appendChild(row);
  });
}

function exampleName() {
  const heading = document.querySelector('.doc-content h1');
  return heading ? `${heading.textContent} example` : 'Math Notes example';
}

function wireExample(figure) {
  const code = figure.querySelector('code[data-calc]');
  if (code) colorize(code);

  const expr = figure.dataset.expr || '';
  const copy = figure.querySelector('[data-action="copy"]');
  const open = figure.querySelector('[data-action="open"]');
  const label = copy ? copy.textContent : '';

  if (copy) {
    copy.addEventListener('click', () => {
      try {
        copyText(expr);
        copy.textContent = copy.dataset.copied || label;
        setTimeout(() => {
          copy.textContent = label;
        }, 1500);
      } catch {
        // clipboard unavailable; leave the label alone
      }
    });
  }

  if (open) {
    open.addEventListener('click', () => {
      buildShareUrl(`${window.location.origin}/`, { name: exampleName(), content: expr })
        .then((built) => {
          if (built) window.location.assign(built.url);
        })
        .catch(() => {});
    });
  }
}

function wireMenu() {
  const toggle = document.querySelector('.doc-menu-toggle');
  const sidebar = document.getElementById('doc-sidebar');
  if (!toggle || !sidebar) return;
  toggle.addEventListener('click', () => {
    const open = sidebar.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}

// Highlight the section of the current page in the sidebar as the reader
// scrolls. The targets are the h2s the sub-navigation links to.
function wireScrollSpy() {
  const links = [...document.querySelectorAll('.doc-nav-sub a[href^="#"]')];
  if (!links.length) return;
  const targets = links
    .map((link) => ({
      link,
      section: document.getElementById(decodeURIComponent(link.hash.slice(1))),
    }))
    .filter((entry) => entry.section);
  if (!targets.length) return;

  let active = null;
  const setActive = (link) => {
    if (link === active) return;
    active = link;
    for (const entry of targets) entry.link.classList.toggle('is-active', entry.link === link);
  };

  // A section is "current" once its top reaches just below the sticky header.
  // Account for `scroll-padding-top`, which is what anchor jumps align to.
  const header = document.querySelector('.doc-header');
  const headerOffset = () => {
    const sticky = header ? header.getBoundingClientRect().height : 72;
    const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    return Math.max(sticky, padding) + 16;
  };

  const update = () => {
    const offset = headerOffset();
    let current = targets[0].link;
    for (const { link, section } of targets) {
      if (section.getBoundingClientRect().top <= offset) current = link;
      else break;
    }
    const atBottom =
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom) current = targets[targets.length - 1].link;
    setActive(current);
  };

  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    },
    { passive: true }
  );
  window.addEventListener('resize', update, { passive: true });
  update();
}

// Static client-side search over the per-language `search.json` the build emits
// next to the pages. The index is fetched lazily the first time it is needed,
// so it never touches the initial render. Matching is accent- and
// case-insensitive over each section's title and text.
function wireSearch() {
  const box = document.querySelector('.doc-search');
  if (!box) return;
  const input = box.querySelector('.doc-search-input');
  const results = box.querySelector('.doc-search-results');
  if (!input || !results) return;
  const emptyMessage = box.dataset.empty || 'No results';

  let loading = null;
  let index = [];
  let items = [];
  let active = -1;

  const normalize = (value) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  function loadIndex() {
    if (!loading) {
      loading = fetch(box.dataset.searchUrl)
        .then((response) => (response.ok ? response.json() : []))
        .then((entries) => {
          index = entries.map((entry) => ({
            ...entry,
            heading: entry.title,
            titleNorm: normalize(entry.title),
            haystack: normalize(`${entry.title} ${entry.text}`),
          }));
          return index;
        })
        .catch(() => []);
    }
    return loading;
  }

  function clear() {
    results.hidden = true;
    results.textContent = '';
    items = [];
    active = -1;
  }

  function render() {
    results.textContent = '';
    if (!items.length) {
      const item = document.createElement('li');
      item.className = 'doc-search-empty';
      item.textContent = emptyMessage;
      results.appendChild(item);
      results.hidden = false;
      return;
    }
    items.forEach((entry, position) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'doc-search-result';
      link.href = entry.anchor ? `${entry.url}#${entry.anchor}` : entry.url;
      const title = document.createElement('span');
      title.className = 'doc-search-title';
      title.textContent = entry.heading;
      const page = document.createElement('span');
      page.className = 'doc-search-page';
      page.textContent = entry.page;
      link.append(title, page);
      if (position === active) link.classList.add('is-active');
      item.appendChild(link);
      results.appendChild(item);
    });
    results.hidden = false;
  }

  function move(step) {
    if (!items.length) return;
    active = (active + step + items.length) % items.length;
    [...results.querySelectorAll('.doc-search-result')].forEach((link, position) =>
      link.classList.toggle('is-active', position === active)
    );
    const current = results.querySelector('.doc-search-result.is-active');
    if (current) current.scrollIntoView({ block: 'nearest' });
  }

  function search(query) {
    const needle = normalize(query.trim());
    if (!needle) {
      clear();
      return;
    }
    const matches = [];
    for (const entry of index) {
      if (!entry.haystack.includes(needle)) continue;
      // Title matches rank above body matches; shorter titles break ties.
      matches.push({ entry, rank: entry.titleNorm.includes(needle) ? 0 : 1 });
    }
    matches.sort((a, b) => a.rank - b.rank || a.entry.heading.length - b.entry.heading.length);
    items = matches.slice(0, 12).map((match) => match.entry);
    active = items.length ? 0 : -1;
    render();
  }

  input.addEventListener('focus', () => {
    loadIndex();
  });
  input.addEventListener('input', () => {
    const value = input.value;
    loadIndex().then(() => {
      if (input.value === value) search(value);
    });
  });
  input.addEventListener('keydown', (event) => {
    if (results.hidden) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      const link = results.querySelectorAll('.doc-search-result')[active];
      if (link) window.location.assign(link.href);
    } else if (event.key === 'Escape') {
      input.value = '';
      clear();
    }
  });
  document.addEventListener('click', (event) => {
    if (!box.contains(event.target)) clear();
  });
}

for (const figure of document.querySelectorAll('.doc-example')) wireExample(figure);
wireMenu();
wireScrollSpy();
wireSearch();

// The app's service worker lives at the site root (scope `/`), so it also keeps
// the documentation available offline once it has been visited.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/serviceWorker.js', { scope: '/' }).catch(() => {});
}
