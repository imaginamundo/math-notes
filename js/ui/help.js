import initModal from './modal.js';
import initExamples from './examples.js';
import { getLocale } from '../i18n/index.js';
import { loadContent } from './helpContent.js';

// The Help modal. Its nav and body are rendered from the lazy-loaded, generated
// content for the active language; the scroll-spy follows the rendered sections.
function initHelpModal(contentEditableNode) {
  const helpButtonNode = document.getElementById('help-button');
  const helpModalNode = document.getElementById('help-modal');
  const navNode = helpModalNode.querySelector('.modal-nav');
  const bodyNode = helpModalNode.querySelector('.modal-body');

  let renderedLang = null;
  let sections = [];
  let navLinks = [];
  let activeId = '';

  const { close } = initModal(helpModalNode, helpButtonNode, {
    onOpen: () => ensureRendered().then(updateActiveLink),
    onClose: () => contentEditableNode.focus(),
  });

  function navLink(section) {
    const link = document.createElement('a');
    link.className = 'modal-nav-link';
    link.href = `#${section.id}`;
    link.textContent = section.nav;
    return link;
  }

  function sectionNode(section) {
    const node = document.createElement('section');
    node.className = 'help-section';
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
    const content = await loadContent('help', lang);
    navNode.textContent = '';
    bodyNode.textContent = '';
    for (const section of content.sections) {
      navNode.appendChild(navLink(section));
      bodyNode.appendChild(sectionNode(section));
    }
    initExamples(bodyNode, contentEditableNode, close);
    sections = [...bodyNode.querySelectorAll('.help-section')];
    navLinks = [...navNode.querySelectorAll('.modal-nav-link')];
    activeId = '';
    renderedLang = lang;
  }

  function updateActiveLink() {
    if (!sections.length) return;
    const threshold = bodyNode.getBoundingClientRect().top + 40;
    const atBottom = bodyNode.scrollTop + bodyNode.clientHeight >= bodyNode.scrollHeight - 1;
    let currentId = sections[0].id;
    for (const section of sections) {
      if (atBottom || section.getBoundingClientRect().top <= threshold) currentId = section.id;
    }
    let activeLink = null;
    navLinks.forEach((link) => {
      const isActive = link.getAttribute('href') === '#' + currentId;
      link.classList.toggle('active', isActive);
      if (isActive) activeLink = link;
    });
    if (currentId !== activeId) {
      activeId = currentId;
      if (activeLink) activeLink.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  bodyNode.addEventListener('scroll', updateActiveLink, { passive: true });
  window.addEventListener('language:updated', () => {
    renderedLang = null;
    if (helpModalNode.open) ensureRendered().then(updateActiveLink);
  });
}

export default initHelpModal;
