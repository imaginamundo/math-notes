// The worker/client wire protocol: the message types both ends speak and the
// setting names that ride on them. Shared so a typo on one end is a test
// failure rather than a silent no-op.
// Bumped whenever the messages or settings change shape. The worker reports it when it
// loads; a page that finds a different one (a worker served by another release after a hard
// reload) stops using that worker and evaluates on the main thread, where the code is its own.
const PROTOCOL_VERSION = 1;

const MSG = {
  evaluate: 'evaluate',
  setting: 'setting',
  result: 'result',
  error: 'error',
  ready: 'ready',
};

// Every name that arrives as `{ type: 'setting', name, value }`, keyed by what
// the code calls it. Use these rather than the strings: a misspelt key is
// `undefined` and fails the protocol test, where a misspelt string would be a
// silent no-op in the worker.
const SETTING = {
  rates: 'rates',
  measurement: 'measurement',
  totalMode: 'total-mode',
  precision: 'precision',
  clockFormat: 'clock-format',
};

// The worker routes all of them; the client also applies the engine-owned
// subset to its main-thread fallback, and seeds a fresh worker with the rest.
const SETTING_NAMES = Object.values(SETTING);
const ENGINE_SETTING_NAMES = [SETTING.rates, SETTING.measurement, SETTING.totalMode];

export { PROTOCOL_VERSION, MSG, SETTING, SETTING_NAMES, ENGINE_SETTING_NAMES };
