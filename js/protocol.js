// The worker/client wire protocol: the message types both ends speak and the
// setting names that ride on them. Shared so a typo on one end is a test
// failure rather than a silent no-op.
const MSG = {
  evaluate: 'evaluate',
  setting: 'setting',
  result: 'result',
  error: 'error',
};

// Every name that arrives as `{ type: 'setting', name, value }`. The worker
// routes all of them; the client also applies the engine-owned subset to its
// main-thread fallback, and seeds a fresh worker with the rest.
const SETTING_NAMES = ['rates', 'measurement', 'total-mode', 'precision', 'clock-format'];
const ENGINE_SETTING_NAMES = ['rates', 'measurement', 'total-mode'];

export { MSG, SETTING_NAMES, ENGINE_SETTING_NAMES };
