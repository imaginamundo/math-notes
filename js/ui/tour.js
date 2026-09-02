// A short guided tour anchored to the real UI.
//
// The two decisions worth knowing: the highlight is an `outline` drawn on the
// anchor itself, not a cloned "spotlight" element — cheaper, and it cannot
// desync from the thing it is pointing at. And the placement maths is a pure
// function, so it is unit-tested without a DOM.

const STEPS = [
  {
    anchor: '#tabs-bar',
    title: 'Sheets live in tabs',
    body: 'Every tab is a separate worksheet, saved as you type. Double-click a tab to rename it, drag to reorder, or press + for a new one.',
    placement: 'bottom',
  },
  {
    anchor: '#input',
    title: 'Type calculations, one per line',
    body: 'Each line is evaluated on its own and its result appears beside it as dimmed ghost text. Use # for a comment, or Label: to name a line.',
    placement: 'bottom',
  },
  {
    anchor: '.total-row',
    title: 'The total adds itself up',
    body: 'Numeric results are summed here automatically. Use sum or average on a line to total just the block above it, up to the last blank line.',
    placement: 'top',
  },
  {
    anchor: '#help-button',
    title: 'Help and Recipes',
    body: 'Help lists every feature — units, currencies, percentages, dates — with clickable examples. Recipes has ready-made sheets to start from.',
    placement: 'top',
  },
  {
    anchor: '#settings-button',
    title: 'Settings',
    body: 'Themes, export and import, and recovery snapshots of every tab. You can replay this tour from here any time.',
    placement: 'top',
  },
];

const GAP = 12;
const MARGIN = 8;

/**
 * Move through the tour, clamped at both ends.
 * Returns the same index at a boundary rather than wrapping or going negative.
 *
 * @param {number} index
 * @param {number} direction  +1 forward, -1 back.
 * @param {number} [total]
 * @returns {number}
 */
function nextStep(index, direction, total = STEPS.length) {
  if (!Number.isFinite(index)) return 0;
  const target = Math.round(index) + Math.sign(direction || 0);
  return Math.max(0, Math.min(total - 1, target));
}

/**
 * Position the popover against an anchor, flipping when the preferred side
 * would put it off-screen and clamping so it always stays in the viewport.
 *
 * Pure: takes plain rectangles, returns plain coordinates. No DOM.
 *
 * @param {{ top: number, left: number, width: number, height: number }} anchor
 * @param {{ width: number, height: number }} popover
 * @param {{ width: number, height: number }} viewport
 * @param {('top'|'bottom')} placement
 * @returns {{ top: number, left: number, placement: ('top'|'bottom') }}
 */
function placeFor(anchor, popover, viewport, placement = 'bottom') {
  const below = anchor.top + anchor.height + GAP;
  const above = anchor.top - popover.height - GAP;

  const fitsBelow = below + popover.height <= viewport.height - MARGIN;
  const fitsAbove = above >= MARGIN;

  let resolved = placement;
  if (placement === 'bottom' && !fitsBelow && fitsAbove) resolved = 'top';
  if (placement === 'top' && !fitsAbove && fitsBelow) resolved = 'bottom';

  const top = resolved === 'top' ? above : below;
  const left = anchor.left + anchor.width / 2 - popover.width / 2;

  return {
    // Clamp last, so a popover taller than the viewport still starts on-screen.
    top: Math.max(MARGIN, Math.min(top, viewport.height - popover.height - MARGIN)),
    left: Math.max(MARGIN, Math.min(left, viewport.width - popover.width - MARGIN)),
    placement: resolved,
  };
}

function initTour(editableNode, onFinish) {
  const rootNode = document.getElementById('tour');
  if (!rootNode) return { start: () => {} };

  let index = 0;
  let highlighted = null;
  let previousFocus = null;
  let open = false;

  const backdrop = document.createElement('div');
  backdrop.className = 'tour-backdrop';

  const popover = document.createElement('div');
  popover.className = 'tour-popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-modal', 'true');
  popover.setAttribute('aria-labelledby', 'tour-title');
  popover.tabIndex = -1;

  const titleNode = document.createElement('h2');
  titleNode.className = 'tour-title';
  titleNode.id = 'tour-title';

  const bodyNode = document.createElement('p');
  bodyNode.className = 'tour-body';

  const countNode = document.createElement('span');
  countNode.className = 'tour-count';

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'tour-back';
  backButton.textContent = 'Back';

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'tour-next';

  const skipButton = document.createElement('button');
  skipButton.type = 'button';
  skipButton.className = 'tour-skip';
  skipButton.textContent = 'Skip tour';

  const actions = document.createElement('div');
  actions.className = 'tour-actions';
  actions.append(countNode, skipButton, backButton, nextButton);
  popover.append(titleNode, bodyNode, actions);

  function clearHighlight() {
    if (highlighted) highlighted.classList.remove('tour-highlight');
    highlighted = null;
  }

  function render() {
    const step = STEPS[index];
    const anchor = document.querySelector(step.anchor);

    clearHighlight();
    if (anchor) {
      anchor.classList.add('tour-highlight');
      highlighted = anchor;
    }

    titleNode.textContent = step.title;
    bodyNode.textContent = step.body;
    countNode.textContent = `${index + 1} of ${STEPS.length}`;
    backButton.disabled = index === 0;
    nextButton.textContent = index === STEPS.length - 1 ? 'Done' : 'Next';

    // Measure after the text is in place, so the height is the real one.
    const rect = anchor
      ? anchor.getBoundingClientRect()
      : { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 };
    const size = popover.getBoundingClientRect();
    const placed = placeFor(
      { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      { width: size.width, height: size.height },
      { width: window.innerWidth, height: window.innerHeight },
      step.placement
    );
    popover.style.top = `${placed.top}px`;
    popover.style.left = `${placed.left}px`;
    popover.dataset.placement = placed.placement;
  }

  function go(direction) {
    const target = nextStep(index, direction);
    if (target === index && direction > 0) {
      finish();
      return;
    }
    index = target;
    render();
  }

  function finish() {
    if (!open) return;
    open = false;
    clearHighlight();
    rootNode.replaceChildren();
    document.removeEventListener('keydown', onKeydown, true);
    window.removeEventListener('resize', render);
    if (previousFocus && previousFocus.focus) previousFocus.focus();
    else editableNode.focus();
    if (onFinish) onFinish();
  }

  function onKeydown(event) {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      finish();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);
    } else if (event.key === 'Tab') {
      // Trap focus: the popover's own buttons are the only stops.
      const stops = [skipButton, backButton, nextButton].filter((node) => !node.disabled);
      const current = stops.indexOf(document.activeElement);
      const offset = event.shiftKey ? -1 : 1;
      const target = stops[(current + offset + stops.length) % stops.length];
      if (target) {
        event.preventDefault();
        target.focus();
      }
    }
  }

  backdrop.addEventListener('click', finish);
  skipButton.addEventListener('click', finish);
  backButton.addEventListener('click', () => go(-1));
  nextButton.addEventListener('click', () => go(1));

  function start() {
    if (open) return;
    open = true;
    index = 0;
    previousFocus = document.activeElement;
    rootNode.replaceChildren(backdrop, popover);
    render();
    popover.focus();
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('resize', render);
  }

  return { start, stop: finish };
}

export { nextStep, placeFor, STEPS };
export default initTour;
