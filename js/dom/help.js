function controlHelpModal(contentEditableNode) {
  const helpButtonNode = document.getElementById('help-button');
  const helpModalNode = document.getElementById('help-modal');

  helpButtonNode.addEventListener('click', () => {
    helpModalNode.style.display = 'block'; 
  });

  helpModalNode.addEventListener('click', () => {
    helpModalNode.style.display = 'none';
    contentEditableNode.focus();
  });
}

export default controlHelpModal;