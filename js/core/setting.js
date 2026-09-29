import storage from '../util/storage.js';

// A persisted setting. Each setting module used to repeat the same read/write/
// normalize shape; this builds it once.
//
//   values      the allowed values (defaults fall back to `defaultValue`)
//   normalize   overrides the values-list check (e.g. a clamped number)
//   inMemory    keep a copy so hot reads (renderers, the worker's formats) do
//               not hit storage; `get`/`set` address it
//   format/parse  store a non-string value (`String` in, a parser out)
function defineSetting({ key, defaultValue, values, normalize, inMemory = false, format, parse }) {
  const normalizeValue = normalize || ((value) => (values.includes(value) ? value : defaultValue));
  let current = defaultValue;

  return {
    key,
    defaultValue,
    normalize: normalizeValue,
    read() {
      const raw = storage.get(key);
      if (raw === null || raw === undefined) return defaultValue;
      return normalizeValue(parse ? parse(raw) : raw);
    },
    write(value) {
      const normalized = normalizeValue(value);
      storage.set(key, format ? format(normalized) : String(normalized));
      if (inMemory) current = normalized;
    },
    get() {
      return current;
    },
    set(value) {
      current = normalizeValue(value);
    },
  };
}

export default defineSetting;
