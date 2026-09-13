import { getLocale } from '../i18n/index.js';

// Lazy-loaded, per-language content for the Help and Examples modals. The
// modules are generated from Markdown by `make -C js/i18n` and only fetched the
// first time a modal needs a language, so they stay out of the boot path.
const cache = new Map();

function loadContent(area, lang = getLocale()) {
  const key = `${area}:${lang}`;
  if (!cache.has(key)) {
    const path = area === 'help' ? `../i18n/help/${lang}.js` : `../i18n/examples/${lang}.js`;
    cache.set(
      key,
      import(path).then((mod) => mod.default)
    );
  }
  return cache.get(key);
}

export { loadContent };
