import initModal from './modal.js';

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

  function updateActiveLink() {
    const threshold = helpBodyNode.getBoundingClientRect().top + 40;
    const atBottom =
      helpBodyNode.scrollTop + helpBodyNode.clientHeight >= helpBodyNode.scrollHeight - 1;
    let currentId = sections[0] ? sections[0].id : '';
    for (const section of sections) {
      if (atBottom || section.getBoundingClientRect().top <= threshold) currentId = section.id;
    }
    navLinks.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + currentId);
    });
  }

  helpModalNode.querySelectorAll('.help-example').forEach((example) => {
    const codeNode = example.querySelector('code');
    if (codeNode) codeNode.textContent = example.dataset.expr;

    const run = () => {
      insertExample(contentEditableNode, example.dataset.expr);
      close();
    };
    example.addEventListener('click', run);
    example.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        run();
      }
    });
  });

  helpBodyNode.addEventListener('scroll', updateActiveLink, { passive: true });
}

function insertExample(editableNode, expression) {
  if (!expression) return;
  const current = editableNode.value;
  editableNode.value = current ? current.replace(/\s+$/, '') + '\n' + expression : expression;
  editableNode.dispatchEvent(new Event('input', { bubbles: true }));
  editableNode.scrollTop = editableNode.scrollHeight;
}

export default initHelpModal;
