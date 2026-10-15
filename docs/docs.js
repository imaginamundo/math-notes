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
      // "Copied" only when something was copied; the clipboard can be blocked outright.
      Promise.resolve(copyText(expr))
        .then((copied) => {
          if (!copied) return;
          copy.textContent = copy.dataset.copied || label;
          setTimeout(() => {
            copy.textContent = label;
          }, 1500);
        })
        .catch(() => {
          // clipboard unavailable; leave the label alone
        });
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
  const backdrop = document.querySelector('.doc-backdrop');
  const header = document.querySelector('.doc-header');
  const root = document.documentElement;

  // On phones the header is a single compact row (brand + toggle); the search,
  // language switcher and app link move to the top of the drawer, so the sticky
  // bar never eats a quarter of the screen. On wider screens they sit in the
  // header. One node is reparented instead of duplicated.
  const actions = document.querySelector('.doc-header-actions');
  const mobile = window.matchMedia('(max-width: 900px)');
  const placeActions = () => {
    if (!actions) return;
    if (mobile.matches) sidebar.prepend(actions);
    else if (header) header.append(actions);
  };
  placeActions();

  // The fixed drawer starts below the header; keep that offset current.
  const sizeHeader = () => {
    if (header) root.style.setProperty('--doc-header-height', `${header.offsetHeight}px`);
  };
  sizeHeader();

  const focusables = () =>
    [...sidebar.querySelectorAll('a[href], button, input, select, textarea')].filter(
      (node) => node.offsetParent !== null
    );

  const main = document.querySelector('.doc-main');
  const setOpen = (open) => {
    sidebar.classList.toggle('is-open', open);
    // An open drawer is a modal: the page behind it cannot be reached, and it says so.
    if (main) main.inert = open;
    if (open) {
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
      sidebar.setAttribute('aria-label', toggle.getAttribute('aria-label') || 'Menu');
    } else {
      sidebar.removeAttribute('role');
      sidebar.removeAttribute('aria-modal');
      sidebar.removeAttribute('aria-label');
    }
    if (backdrop) backdrop.classList.toggle('is-open', open);
    // Lock the page so it cannot scroll behind the drawer.
    root.classList.toggle('doc-menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      sizeHeader();
      // Focus lands in the drawer, then the current page's entry is brought
      // into view (otherwise the reader starts at the top of the list).
      const first = sidebar.querySelector('.doc-search-input') || focusables()[0];
      if (first) first.focus();
      const current =
        sidebar.querySelector('.doc-nav-sub a.is-active') ||
        sidebar.querySelector('.doc-nav-item.is-active');
      if (current) current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } else {
      toggle.focus();
    }
  };

  toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('is-open')));
  if (backdrop) backdrop.addEventListener('click', () => setOpen(false));

  // Tapping any link in the drawer navigates (or jumps to a section) and closes
  // it. Scroll is unlocked here, before the browser runs the default jump, so
  // the anchor lands at the right heading.
  sidebar.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (!sidebar.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Tab') {
      // Focus stays inside the drawer: Tab wraps from its last control to its first.
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  window.addEventListener('resize', sizeHeader);
  mobile.addEventListener('change', () => {
    placeActions();
    if (mobile.matches) sizeHeader();
    else if (sidebar.classList.contains('is-open')) setOpen(false);
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

  // ARIA 1.2 combobox: the input owns the listbox and points at the highlighted option; a
  // polite live region says how many results there are, since the highlight alone is not
  // announced.
  results.id ||= 'doc-search-results';
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', results.id);
  input.setAttribute('aria-autocomplete', 'list');
  const status = document.createElement('span');
  status.className = 'sr-only doc-search-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  box.appendChild(status);

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
        // A failed fetch is not remembered: the next query tries again.
        .catch(() => {
          loading = null;
          return [];
        });
    }
    return loading;
  }

  function clear() {
    results.hidden = true;
    results.textContent = '';
    items = [];
    active = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    status.textContent = '';
  }

  function render() {
    results.textContent = '';
    if (!items.length) {
      const item = document.createElement('li');
      item.className = 'doc-search-empty';
      item.textContent = emptyMessage;
      results.appendChild(item);
      results.hidden = false;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      status.textContent = emptyMessage;
      return;
    }
    items.forEach((entry, position) => {
      const item = document.createElement('li');
      item.setAttribute('role', 'option');
      item.id = `${results.id}-${position}`;
      item.setAttribute('aria-selected', String(position === active));
      const link = document.createElement('a');
      link.className = 'doc-search-result';
      // The input drives the list with the arrow keys; a result is not a separate Tab stop.
      link.tabIndex = -1;
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
    input.setAttribute('aria-expanded', 'true');
    if (active >= 0) input.setAttribute('aria-activedescendant', `${results.id}-${active}`);
    status.textContent = `${items.length} ${items.length === 1 ? 'result' : 'results'}`;
  }

  function move(step) {
    if (!items.length) return;
    active = (active + step + items.length) % items.length;
    [...results.querySelectorAll('.doc-search-result')].forEach((link, position) => {
      link.classList.toggle('is-active', position === active);
      link.parentElement.setAttribute('aria-selected', String(position === active));
    });
    input.setAttribute('aria-activedescendant', `${results.id}-${active}`);
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
      // A real click: it navigates, and the drawer and the results close as they do for a tap.
      const link = results.querySelectorAll('.doc-search-result')[active];
      if (link) link.click();
    } else if (event.key === 'Escape') {
      // The first Escape closes the results; a second one is left for the mobile drawer.
      event.stopPropagation();
      input.value = '';
      clear();
    }
  });
  document.addEventListener('click', (event) => {
    if (!box.contains(event.target)) clear();
  });
  // Choosing a result (here or on the page the link lands on) closes the list.
  results.addEventListener('click', (event) => {
    if (event.target.closest('a')) setTimeout(clear);
  });
  // Tabbing away closes the popup as well, so Esc is never needed to dismiss it.
  // A press with the mouse or a finger is left to the click handler above: closing the list
  // on mousedown would shift the page under the pointer and the click would miss.
  let pointerDown = false;
  document.addEventListener('pointerdown', () => (pointerDown = true), true);
  document.addEventListener('pointerup', () => setTimeout(() => (pointerDown = false)), true);
  box.addEventListener('focusout', (event) => {
    if (pointerDown) return;
    if (event.relatedTarget && !box.contains(event.relatedTarget)) clear();
  });
}

// The theme and text size follow the app, across windows and at load (the head script sets
// the theme and size once; the browser chrome colour and later changes are handled here).
const THEME_COLORS = {
  'one-dark': '#282c34',
  dracula: '#282a36',
  'solarized-dark': '#002b36',
  monokai: '#272822',
  light: '#ffffff',
};
function syncThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  const color = THEME_COLORS[document.documentElement.dataset.theme || 'one-dark'];
  if (meta && color) meta.setAttribute('content', color);
}
syncThemeColor();
window.addEventListener('storage', (event) => {
  if (event.key === 'math-notes-theme' && event.newValue in THEME_COLORS) {
    document.documentElement.dataset.theme = event.newValue;
    syncThemeColor();
  } else if (event.key === 'math-notes-font-scale') {
    const scale = parseInt(event.newValue, 10);
    if (scale >= 50 && scale <= 200) {
      document.documentElement.style.setProperty('--app-font-scale', String(scale / 100));
    }
  }
});

for (const figure of document.querySelectorAll('.doc-example')) wireExample(figure);
wireMenu();
wireScrollSpy();
wireSearch();

// The app's service worker lives at the site root (scope `/`), so it also keeps
// the documentation available offline once it has been visited.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/serviceWorker.js', { scope: '/' }).catch(() => {});
}
