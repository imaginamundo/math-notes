import { getLocale } from '../i18n/index.js';

// The documentation is published per language at /docs (en), /docs/pt and
// /docs/es. A locale without a translated build falls back to English rather
// than a 404.
const PATHS = { en: '/docs/', pt: '/docs/pt/', es: '/docs/es/' };

function initDocsLink() {
  const update = () => {
    const href = PATHS[getLocale()] || PATHS.en;
    for (const node of document.querySelectorAll('[data-docs-link]')) {
      node.setAttribute('href', href);
    }
  };
  update();
  window.addEventListener('language:updated', update);
}

export default initDocsLink;
