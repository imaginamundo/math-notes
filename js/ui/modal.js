// Generic modal component built on the native <dialog> element.
// Handles open/close wiring, backdrop clicks and the close event.
// Esc is handled natively by <dialog>.
function initModal(dialogNode, openButtonNode, { onOpen, onClose } = {}) {
  function open() {
    if (!dialogNode.open) {
      dialogNode.showModal();
      if (onOpen) onOpen();
    }
  }

  function close() {
    if (dialogNode.open) dialogNode.close();
  }

  openButtonNode.addEventListener('click', open);

  dialogNode.querySelectorAll('[data-modal-close]').forEach((button) => {
    button.addEventListener('click', close);
  });

  // Clicking the backdrop targets the dialog element itself.
  dialogNode.addEventListener('click', (event) => {
    if (event.target === dialogNode) close();
  });

  dialogNode.addEventListener('close', () => {
    if (onClose) onClose();
  });

  return { open, close };
}

export default initModal;
