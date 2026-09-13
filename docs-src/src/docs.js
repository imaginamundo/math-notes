// Progressive enhancement for the documentation pages. The content and
// navigation are fully rendered at build time; this only adds the app's syntax
// colours, copy buttons, "Open in Math Notes" links, the mobile menu and the
// sidebar scroll-spy.
import format from '/js/render/format.js';
import { collectVariableNames } from '/js/core/multiWordVariables.js';
import { buildShareUrl } from '/js/share/shareLink.js';
import { copyText } from '/js/util/clipboard.js';

function colorize(code) {
  const text = code.textContent;
  const lines = text.split('\n');
  const names = collectVariableNames(lines);
  code.textContent = '';
  lines.forEach((line, index) => {
    code.appendChild(format.line(line, names));
    if (index < lines.length - 1) code.appendChild(document.createTextNode('\n'));
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

for (const figure of document.querySelectorAll('.doc-example')) wireExample(figure);
wireMenu();
wireScrollSpy();

// The app's service worker lives at the site root (scope `/`), so it also keeps
// the documentation available offline once it has been visited.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/serviceWorker.js', { scope: '/' }).catch(() => {});
}
