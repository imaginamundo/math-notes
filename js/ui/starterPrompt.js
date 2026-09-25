import { isStarterSheet } from './onboarding.js';
import storage from '../util/storage.js';
import { setEditorValue } from './editorInput.js';
import { t } from '../i18n/index.js';

// A small floating "Keep content | Clear content" control shown right after the
// seeded Welcome sheet, so the sample content can be dismissed or emptied with
// one click. It only appears while the active tab still holds exactly the
// starter sheet and the visitor has not already dealt with it.
const DISMISSED_KEY = 'math-notes-starter-dismissed';
const GAP_AFTER_LINES = 10;

export { DISMISSED_KEY };

function readDismissed() {
  return storage.get(DISMISSED_KEY) === '1';
}

function writeDismissed() {
  storage.set(DISMISSED_KEY, '1');
}

function initStarterPrompt(editableNode) {
  const scroller = editableNode.closest('.editor-scroll');
  if (!scroller) return;

  const control = document.createElement('div');
  control.className = 'starter-prompt';
  control.setAttribute('role', 'group');

  const keepButton = document.createElement('button');
  keepButton.type = 'button';
  keepButton.className = 'starter-keep';
  keepButton.addEventListener('click', () => {
    writeDismissed();
    hide();
  });

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'starter-clear';
  clearButton.addEventListener('click', () => {
    writeDismissed();
    setEditorValue(editableNode, '');
  });

  function refreshLabels() {
    control.setAttribute('aria-label', t('starter.group'));
    keepButton.textContent = t('starter.keep');
    keepButton.title = t('starter.keepTitle');
    clearButton.textContent = t('starter.clear');
    clearButton.title = t('starter.clearTitle');
  }
  refreshLabels();
  window.addEventListener('language:updated', refreshLabels);

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
  // settles it. A programmatic write (a tab switch, undo/redo, restore) is not
  // a user edit, so it never settles the prompt.
  editableNode.addEventListener('input', (event) => {
    if (event.programmatic || isStarterSheet(editableNode.value)) {
      refresh();
      return;
    }
    const wasVisible = control.classList.contains('visible');
    hide();
    if (wasVisible) writeDismissed();
  });
  window.addEventListener('resize', refresh);
  window.addEventListener('math:font-size-changed', refresh);

  refresh();
}

export default initStarterPrompt;
