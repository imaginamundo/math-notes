// Progressive enhancement for the documentation pages. The content and
// navigation are fully rendered at build time; this only adds the app's syntax
// colours, copy buttons, "Open in Math Notes" links and the mobile menu.
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

for (const figure of document.querySelectorAll('.doc-example')) wireExample(figure);
wireMenu();

// Register the same service worker the app uses so the docs work offline too.
// Best effort: if the scope is not allowed the registration is simply skipped.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/js/serviceWorker.js', { scope: '/' }).catch(() => {});
}
