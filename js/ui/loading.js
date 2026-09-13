// A "Loading…" indicator for the status bar, shown while an evaluation is in
// flight. The dots cycle in place so a long sheet still feels alive without the
// text shifting the bar's layout.
import { t } from '../i18n/index.js';

const FRAME_COUNT = 4;
const FRAME_DELAY = 300;

function initLoadingIndicator(rootNode) {
  if (!rootNode) return { show: () => {}, hide: () => {} };
  const dotsNode = rootNode.querySelector('.loading-dots');
  let timer = null;
  let frame = 0;

  function draw() {
    if (dotsNode) dotsNode.textContent = `${t('loading.dots')}${'.'.repeat(frame)}`;
    frame = (frame + 1) % FRAME_COUNT;
  }

  function show() {
    if (timer !== null) return;
    frame = 0;
    draw();
    rootNode.classList.add('visible');
    timer = setInterval(draw, FRAME_DELAY);
  }

  function hide() {
    if (timer === null) return;
    clearInterval(timer);
    timer = null;
    rootNode.classList.remove('visible');
  }

  return { show, hide };
}

export default initLoadingIndicator;
