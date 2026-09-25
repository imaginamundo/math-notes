import { normalizeTotalMode, readTotalMode, writeTotalMode } from '../core/totalMode.js';

// The bottom bar's aggregate picker (total / average / median).
function initTotalMode() {
  const select = document.getElementById('total-mode');
  if (!select) return;

  select.value = readTotalMode();
  select.addEventListener('change', () => {
    const mode = normalizeTotalMode(select.value);
    writeTotalMode(mode);
    select.value = mode;
    window.dispatchEvent(new CustomEvent('total-mode:updated', { detail: mode }));
  });
}

export default initTotalMode;
