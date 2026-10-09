import initModal from './modal.js';
import initExamples from './examples.js';
import { getLocale, t } from '../i18n/index.js';
import { LANGUAGE_UPDATED } from '../util/events.js';

// The Examples modal. Its sections are rendered from the lazy-loaded, generated
// content for the active language; a language's module is only fetched the first
// time the modal opens, so the prose stays out of the boot path.
const cache = new Map();

function loadContent(lang) {
  if (!cache.has(lang)) {
    const pending = import(`../i18n/examples/${lang}.js`).then((module) => module.default);
    cache.set(lang, pending);
    // A rejected import must not be cached, or the modal would keep failing
    // every time it opens instead of trying again.
    pending.catch(() => cache.delete(lang));
  }
  return cache.get(lang);
}

function initRecipes(contentEditableNode) {
  const recipesButtonNode = document.getElementById('recipes-button');
  const recipesModalNode = document.getElementById('recipes-modal');
  const bodyNode = recipesModalNode.querySelector('.modal-body');

  let renderedLang = null;

  const { close } = initModal(recipesModalNode, recipesButtonNode, {
    onOpen: ensureRendered,
  });

  function sectionNode(section) {
    const node = document.createElement('section');
    node.className = 'modal-section';
    node.id = section.id;
    const heading = document.createElement('h2');
    heading.textContent = section.nav;
    node.appendChild(heading);
    node.insertAdjacentHTML('beforeend', section.html);
    return node;
  }

  async function ensureRendered() {
    const lang = getLocale();
    if (renderedLang === lang) return;
    let content = null;
    try {
      content = await loadContent(lang);
    } catch {
      // fall through to the message below; the next open retries
    }
    bodyNode.textContent = '';
    if (!content) {
      const message = document.createElement('p');
      message.textContent = t('examples.loadFailed');
      bodyNode.appendChild(message);
      return;
    }
    if (content.intro) {
      const intro = document.createElement('p');
      intro.innerHTML = content.intro;
      bodyNode.appendChild(intro);
    }
    for (const section of content.sections) bodyNode.appendChild(sectionNode(section));
    initExamples(bodyNode, contentEditableNode, close);
    renderedLang = lang;
  }

  window.addEventListener(LANGUAGE_UPDATED, () => {
    renderedLang = null;
    if (recipesModalNode.open) ensureRendered();
  });
}

export default initRecipes;
