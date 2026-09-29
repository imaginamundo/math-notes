import { normalizeTotalMode, readTotalMode, writeTotalMode } from '../core/totalMode.js';
import { TOTAL_MODE_UPDATED } from '../util/events.js';

// The bottom bar's aggregate picker (total / average / median).
function initTotalMode() {
  const select = document.getElementById('total-mode');
  if (!select) return;

  select.value = readTotalMode();
  select.addEventListener('change', () => {
    const mode = normalizeTotalMode(select.value);
    writeTotalMode(mode);
    select.value = mode;
    window.dispatchEvent(new CustomEvent(TOTAL_MODE_UPDATED, { detail: mode }));
  });
}

export default initTotalMode;
