import defineSetting from './setting.js';

// Which aggregate the bottom total bar shows. `sum` is the default.
const TOTAL_MODES = ['sum', 'average', 'median'];
const DEFAULT_TOTAL_MODE = 'sum';

const setting = defineSetting({
  key: 'math-notes-total-mode',
  values: TOTAL_MODES,
  defaultValue: DEFAULT_TOTAL_MODE,
});

const STORAGE_KEY = setting.key;
const normalizeTotalMode = setting.normalize;
const readTotalMode = setting.read;
const writeTotalMode = setting.write;

export {
  STORAGE_KEY,
  TOTAL_MODES,
  DEFAULT_TOTAL_MODE,
  normalizeTotalMode,
  readTotalMode,
  writeTotalMode,
};
