import { getLocale } from '../i18n/index.js';

// The documentation is published per language at /docs (en), /docs/pt and
// /docs/es. Only languages present in the map are linked; a locale without a
// translated build falls back to English instead of a 404. Add `pt`/`es` here
// once their docs sources exist under docs/src/.
const PATHS = { en: '/docs/' };

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
