function initFontControls() {
  const fontMinusNode = document.getElementById('font-minus');
  const fontPlusNode = document.getElementById('font-plus');
  const fontResetNode = document.getElementById('font-reset');

  // Change font size
  const fontSize = {
    min: 10,
    max: 80,
    current: 16,
  };
  function setFontSize() {
    try {
      window.localStorage.setItem('math-notes-font-size', String(fontSize.current));
    } catch {
      // storage unavailable
    }
    document.documentElement.style.setProperty('--app-font-size', `${fontSize.current}px`);
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

  let saved = null;
  let legacy = null;
  try {
    saved = parseInt(window.localStorage.getItem('math-notes-font-size'), 10);
    legacy = parseInt(window.localStorage.getItem('fontSize'), 10);
  } catch {
    // storage unavailable
  }
  const current = saved || legacy;
  if (current) {
    fontSize.current = Math.min(fontSize.max, Math.max(fontSize.min, current));
    setFontSize();
    if (!saved && legacy) {
      try {
        window.localStorage.removeItem('fontSize');
      } catch {
        // storage unavailable
      }
    }
  }
}

export default initFontControls;
