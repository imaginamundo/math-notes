function initFontControls() {
  const fontMinusNode = document.getElementById('font-minus');
  const fontPlusNode = document.getElementById('font-plus');
  const fontResetNode = document.getElementById('font-reset');

  // Change font size
  const fontSize = {
    min: 10,
    max: 80,
    current: 14,
  };
  function setFontSize() {
    window.localStorage.fontSize = fontSize.current;
    document.body.style.fontSize = `${fontSize.current}px`;
  }
  fontMinusNode.addEventListener('click', () => {
    if (fontSize.current <= fontSize.min) return;
    fontSize.current--;
    setFontSize();
  });

  fontPlusNode.addEventListener('click', () => {
    if (fontSize.current >= fontSize.max) return;
    fontSize.current++;
    setFontSize();
  });
  fontResetNode.addEventListener('click', () => {
    fontSize.current = 14;
    setFontSize();
  });

  const saved = parseInt(window.localStorage.fontSize, 10);
  if (saved) {
    fontSize.current = Math.min(fontSize.max, Math.max(fontSize.min, saved));
    setFontSize();
  }
}

export default initFontControls;
