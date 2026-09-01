function initIo(editableNode) {
  const exportButton = document.getElementById('export-button');
  const importButton = document.getElementById('import-button');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.txt,.numi,text/plain';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  exportButton.addEventListener('click', () => {
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(`math-notes-${date}.txt`, editableNode.value);
  });

  importButton.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imported = String(reader.result).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      if (
        editableNode.value &&
        !window.confirm("Importing will replace the current tab's content. Continue?")
      ) {
        return;
      }
      editableNode.value = imported;
      editableNode.dispatchEvent(new Event('input', { bubbles: true }));
      const scroller = editableNode.closest('.editor-scroll');
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
    };
    reader.readAsText(file);
  });
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default initIo;
