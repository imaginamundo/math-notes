import storage from '../util/storage.js';

// Applies a saved font size at startup and handles the +/-/reset buttons.
// `onChange` is invoked after the new size is applied, so the editor can
// re-sync its line-height and character width to the new metrics.
const FONT_KEY = 'math-notes-font-size';

export { FONT_KEY };

function initFontControls(onChange = () => {}) {
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
    storage.set(FONT_KEY, String(fontSize.current));
    document.documentElement.style.setProperty('--app-font-size', `${fontSize.current}px`);
    onChange();
    // Floating controls that anchor themselves to the editor metrics (the
    // starter prompt) must reposition after a font change.
    window.dispatchEvent(new Event('math:font-size-changed'));
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
    fontSize.current = 16;
    setFontSize();
  });

  const saved = parseInt(storage.get(FONT_KEY), 10);
  if (saved) {
    fontSize.current = Math.min(fontSize.max, Math.max(fontSize.min, saved));
    setFontSize();
  }
}

export default initFontControls;
