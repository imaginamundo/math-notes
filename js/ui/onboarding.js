import storage from '../util/storage.js';
import { t } from '../i18n/index.js';

const ONBOARDED_KEY = 'math-notes-onboarded';
const TABS_KEY = 'math-notes-tabs';

// A working mini-tutorial rather than a wall of prose: every line evaluates, so
// the very first screen demonstrates the app. The comment lines follow the
// interface language; the expressions stay in the calculator's language.
function starterSheet() {
  return [
    t('starter.welcomeComment'),
    'people = 4',
    'slices = 12',
    'slices / people',
    '',
    t('starter.labelComment'),
    'Coffee: 3.40',
    'Lunch: 12.90',
    'sum',
    '',
    t('starter.tagComment'),
    '20 #food',
    '15 #food',
    '#food',
    '3 days + 4 hours in hours',
    '15% of 240',
    'today + 2 weeks',
  ].join('\n');
}

// The exact content seeded this session, so the prompt keeps recognising it
// even if the interface language changes afterwards.
let seededSheet = null;

function isStarterSheet(content) {
  return content === (seededSheet === null ? starterSheet() : seededSheet);
}

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
 * Seeds the starter sheet on a first visit, so the opening screen demonstrates
 * the app instead of describing it.
 *
 * @param {HTMLTextAreaElement} editableNode
 * @param {{ seedSheet: Function }} tabsApi
 * @param {{ onboarded: string|null, tabs: string|null }} storedState
 *   From `readOnboardingState()`, captured before `initTabs` ran.
 */
function initOnboarding(editableNode, tabsApi, storedState) {
  const firstRun = isFirstRun({
    onboarded: storedState.onboarded,
    tabs: storedState.tabs,
    // Read live: this reflects whatever tabs.js restored into the editor.
    content: editableNode.value,
  });
  if (!firstRun) return;

  // Set the flag BEFORE seeding, so a crash mid-seed cannot loop the user
  // through onboarding on every reload.
  writeStorage(ONBOARDED_KEY, '1');
  const sheet = starterSheet();
  seededSheet = sheet;
  tabsApi.seedSheet({ name: t('starter.name'), content: sheet });
}

export { isFirstRun, readOnboardingState, starterSheet, isStarterSheet, ONBOARDED_KEY };
export default initOnboarding;
