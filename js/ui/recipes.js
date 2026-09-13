import initModal from './modal.js';
import initExamples from './examples.js';
import { getLocale } from '../i18n/index.js';

// The Examples modal. Its sections are rendered from the lazy-loaded, generated
// content for the active language; a language's module is only fetched the first
// time the modal opens, so the prose stays out of the boot path.
const cache = new Map();

function loadContent(lang) {
  if (!cache.has(lang)) {
    cache.set(
      lang,
      import(`../i18n/examples/${lang}.js`).then((module) => module.default)
    );
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
    onClose: () => contentEditableNode.focus(),
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
    const content = await loadContent(lang);
    bodyNode.textContent = '';
    if (content.intro) {
      const intro = document.createElement('p');
      intro.innerHTML = content.intro;
      bodyNode.appendChild(intro);
    }
    for (const section of content.sections) bodyNode.appendChild(sectionNode(section));
    initExamples(bodyNode, contentEditableNode, close);
    renderedLang = lang;
  }

  window.addEventListener('language:updated', () => {
    renderedLang = null;
    if (recipesModalNode.open) ensureRendered();
  });
}

export default initRecipes;
