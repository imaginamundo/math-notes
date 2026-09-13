import initModal from './modal.js';
import initExamples from './examples.js';

function initHelpModal(contentEditableNode) {
  const helpButtonNode = document.getElementById('help-button');
  const helpModalNode = document.getElementById('help-modal');
  const helpBodyNode = helpModalNode.querySelector('.modal-body');
  const sections = [...helpModalNode.querySelectorAll('.help-section')];
  const navLinks = [...helpModalNode.querySelectorAll('.modal-nav-link')];

  const { close } = initModal(helpModalNode, helpButtonNode, {
    onOpen: updateActiveLink,
    onClose: () => contentEditableNode.focus(),
  });

  initExamples(helpModalNode, contentEditableNode, close);

  let activeId = '';

  function updateActiveLink() {
    const threshold = helpBodyNode.getBoundingClientRect().top + 40;
    const atBottom =
      helpBodyNode.scrollTop + helpBodyNode.clientHeight >= helpBodyNode.scrollHeight - 1;
    let currentId = sections[0] ? sections[0].id : '';
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

  helpBodyNode.addEventListener('scroll', updateActiveLink, { passive: true });
}

export default initHelpModal;
