import formatResult from './formatResult.js';

// The visible total updates on every evaluation, but the screen reader should
// not announce every recompute while someone is still typing. Announcements go
// through a separate sr-only aria-live region and are debounced, so only a
// settled value is spoken.
const ANNOUNCE_DELAY = 800;
let announceTimer = null;

function renderTotal(totalNode, total) {
  const text = total === null ? '' : formatResult(total);
  totalNode.textContent = text;

  const live = liveRegionFor(totalNode);
  if (!live) return;
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    if (live.textContent !== text) live.textContent = text;
  }, ANNOUNCE_DELAY);
}

// A visually-hidden polite live region next to the total. Kept in the DOM once
// created so the whole page does not re-announce on every visit.
function liveRegionFor(totalNode) {
  if (!totalNode.parentNode) return null;
  const existing = totalNode.parentNode.querySelector('.total-live');
  if (existing) return existing;
  const live = document.createElement('span');
  live.className = 'sr-only total-live';
  live.setAttribute('aria-live', 'polite');
  totalNode.insertAdjacentElement('afterend', live);
  return live;
}

export default renderTotal;
