import initTour from './tour.js';

const ONBOARDED_KEY = 'math-notes-onboarded';
const TABS_KEY = 'math-notes-tabs';

// A working mini-tutorial rather than a wall of prose: every line below
// evaluates, so the very first screen already demonstrates the app.
const STARTER_SHEET = [
  '# Welcome! This is a Math Notes sheet.',
  '# Every line is evaluated and its result appears to the right.',
  '',
  'Coffee: 3.40',
  'Lunch: 12.90',
  'Books: 24',
  'sum',
  '',
  '# Name a value and reuse it, or refer to the line above with prev:',
  'people = 3',
  'prev * 2',
  '',
  '# Units, percentages and sequences all work:',
  '3 days + 4 hours in hours',
  '15% of 240',
  '1:10',
].join('\n');

const STARTER_NAME = 'Welcome';

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable; the tour simply runs again next time
  }
}

/**
 * Is this genuinely a first run?
 *
 * All three conditions, deliberately. The flag alone is not enough: someone
 * who clears one localStorage key should not have their existing sheet
 * overwritten by the starter content.
 *
 * @param {{ onboarded: string|null, tabs: string|null, content: string }} state
 * @returns {boolean}
 */
function isFirstRun({ onboarded, tabs, content }) {
  return !onboarded && !tabs && content.trim() === '';
}

/**
 * Snapshot the storage keys first-run detection depends on.
 *
 * This MUST be called before `initTabs`, which persists a fresh tab collection
 * during its own initialisation — by the time `initOnboarding` runs,
 * `math-notes-tabs` always exists and every visit would look like a return
 * visit.
 *
 * @returns {{ onboarded: string|null, tabs: string|null }}
 */
function readOnboardingState() {
  return { onboarded: readStorage(ONBOARDED_KEY), tabs: readStorage(TABS_KEY) };
}

/**
 * Seeds the starter sheet and runs the tour on a first visit, and wires the
 * "Replay tutorial" button for every visit after that.
 *
 * @param {HTMLTextAreaElement} editableNode
 * @param {{ seedSheet: Function }} tabsApi
 * @param {{ onboarded: string|null, tabs: string|null }} storedState
 *   From `readOnboardingState()`, captured before `initTabs` ran.
 */
function initOnboarding(editableNode, tabsApi, storedState) {
  const tour = initTour(editableNode, () => writeStorage(ONBOARDED_KEY, '1'));

  const replayButton = document.getElementById('replay-tour-button');
  if (replayButton) {
    replayButton.addEventListener('click', () => {
      const modal = document.getElementById('settings-modal');
      if (modal && modal.open) modal.close();
      tour.start();
    });
  }

  const firstRun = isFirstRun({
    onboarded: storedState.onboarded,
    tabs: storedState.tabs,
    // Read live: this reflects whatever tabs.js restored into the editor.
    content: editableNode.value,
  });
  if (!firstRun) return;

  // Set the flag BEFORE seeding, so a crash mid-tour cannot loop the user
  // through onboarding on every reload.
  writeStorage(ONBOARDED_KEY, '1');
  tabsApi.seedSheet({ name: STARTER_NAME, content: STARTER_SHEET });
  tour.start();
}

export { isFirstRun, readOnboardingState, STARTER_SHEET, STARTER_NAME, ONBOARDED_KEY };
export default initOnboarding;
