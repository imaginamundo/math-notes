import { STARTER_SHEET } from './onboarding.js';

// A small floating "Keep content | Clear content" control shown right after the
// seeded Welcome sheet, so the sample content can be dismissed or emptied with
// one click. It only appears while the active tab still holds exactly the
// starter sheet and the visitor has not already dealt with it.
const DISMISSED_KEY = 'math-notes-starter-dismissed';
const GAP_AFTER_LINES = 10;

function readDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, '1');
  } catch {
    // storage unavailable; the control simply shows again next time
  }
}

function isStarterSheet(content) {
  return content === STARTER_SHEET;
}

function initStarterPrompt(editableNode) {
  const scroller = editableNode.closest('.editor-scroll');
  if (!scroller) return;

  const control = document.createElement('div');
  control.className = 'starter-prompt';
  control.setAttribute('role', 'group');
  control.setAttribute('aria-label', 'Starter content actions');

  const keepButton = document.createElement('button');
  keepButton.type = 'button';
  keepButton.textContent = 'Keep content';
  keepButton.title = 'Keep this example content';
  keepButton.addEventListener('click', () => {
    writeDismissed();
    hide();
  });

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.textContent = 'Clear content';
  clearButton.title = 'Empty this tab';
  clearButton.addEventListener('click', () => {
    writeDismissed();
    editableNode.value = '';
    editableNode.dispatchEvent(new Event('input', { bubbles: true }));
  });

  control.append(keepButton, clearButton);
  scroller.appendChild(control);

  function position() {
    const cs = getComputedStyle(editableNode);
    const lineHeight =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--editor-line-height')
      ) || Math.round(parseFloat(cs.fontSize) * 1.65);
    const lineCount = editableNode.value.split('\n').length;
    control.style.left = `${parseFloat(cs.paddingLeft)}px`;
    control.style.top = `${parseFloat(cs.paddingTop) + lineCount * lineHeight + GAP_AFTER_LINES}px`;
  }

  function show() {
    position();
    control.classList.add('visible');
  }

  function hide() {
    control.classList.remove('visible');
  }

  function refresh() {
    if (readDismissed() || !isStarterSheet(editableNode.value)) {
      hide();
      return;
    }
    show();
  }

  // React to edits: leaving the starter sheet hides the control and remembers
  // it was dealt with, so the prompt never nags again. Returning to the
  // untouched starter sheet keeps it available until a button or an edit
  // settles it.
  editableNode.addEventListener('input', () => {
    if (isStarterSheet(editableNode.value)) {
      refresh();
      return;
    }
    const wasVisible = control.classList.contains('visible');
    hide();
    if (wasVisible) writeDismissed();
  });
  window.addEventListener('resize', refresh);

  refresh();
}

export default initStarterPrompt;
