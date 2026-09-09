import storage from '../util/storage.js';

// Applies a saved font scale at startup and handles the +/-/reset buttons.
// The scale is a percentage of the browser's default font size (the user's
// preferred size), so 100% matches their accessibility setting. `onChange` is
// invoked after the new scale is applied, so the editor can re-sync its
// line-height and character width to the new metrics.
const FONT_KEY = 'math-notes-font-scale';
const DEFAULT_SCALE = 100;
const MIN_SCALE = 50;
const MAX_SCALE = 200;
const STEP = 10;

export { FONT_KEY };

function clampScale(value) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function initFontControls(onChange = () => {}) {
  const fontMinusNode = document.getElementById('font-minus');
  const fontPlusNode = document.getElementById('font-plus');
  const fontResetNode = document.getElementById('font-reset');

  let current = DEFAULT_SCALE;

  function applyScale() {
    storage.set(FONT_KEY, String(current));
    document.documentElement.style.setProperty('--app-font-scale', String(current / 100));
    onChange();
    // Floating controls that anchor themselves to the editor metrics (the
    // starter prompt) must reposition after a font change.
    window.dispatchEvent(new Event('math:font-size-changed'));
  }

  function setScale(value) {
    current = clampScale(value);
    applyScale();
  }

  fontMinusNode.addEventListener('click', () => {
    if (current > MIN_SCALE) setScale(current - STEP);
  });

  fontPlusNode.addEventListener('click', () => {
    if (current < MAX_SCALE) setScale(current + STEP);
  });

  fontResetNode.addEventListener('click', () => {
    setScale(DEFAULT_SCALE);
  });

  const saved = parseInt(storage.get(FONT_KEY), 10);
  if (!Number.isNaN(saved)) setScale(saved);
}

export default initFontControls;
