import initTour from './tour.js';
import storage from '../util/storage.js';

const ONBOARDED_KEY = 'math-notes-onboarded';
const TABS_KEY = 'math-notes-tabs';

// A working mini-tutorial rather than a wall of prose: every line below
// evaluates, so the very first screen already demonstrates the app.
const STARTER_SHEET = [
  '# Welcome! Every line below is evaluated; results appear on the right.',
  '',
  '# A label before a colon names the line; the math after it still runs:',
  'Coffee: 3.40',
  'Lunch: 12.90',
  'sum',
  '',
  '# Name a value with = and reuse it on a later line:',
  'people = 3',
  'slices = 9',
  'slices / people',
  '',
  '# prev is the previous result — blank lines and comments are skipped:',
  'prev + 1',
  '',
  '# Units, percentages and lists work too:',
  '3 days + 4 hours in hours',
  '15% of 240',
].join('\n');

const STARTER_NAME = 'Welcome';

function readStorage(key) {
  return storage.get(key);
}

function writeStorage(key, value) {
  storage.set(key, value);
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
