import { test } from 'node:test';
import assert from 'node:assert/strict';
import storage from '../js/util/storage.js';
import { loadTabsState, STORAGE_KEY, BACKUP_KEY } from '../js/storage/tabsStore.js';

function fakeStorage(overrides = {}) {
  const store = overrides.store || new Map();
  return {
    store,
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    ...overrides.methods,
  };
}

function withGlobals({ localStorage, window }, fn) {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true });
  if (window) Object.defineProperty(globalThis, 'window', { value: window, configurable: true });
  try {
    return fn();
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else delete globalThis.localStorage;
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else delete globalThis.window;
  }
}

test('a successful write reports success', () => {
  const fake = fakeStorage();
  const ok = withGlobals({ localStorage: fake }, () => storage.set('k', 'v'));
  assert.equal(ok, true);
  assert.equal(fake.store.get('k'), 'v');
});

test('a failed write reports failure and notifies instead of throwing', () => {
  const events = [];
  const fake = fakeStorage({
    methods: {
      setItem() {
        throw new Error('QuotaExceededError');
      },
    },
  });
  const ok = withGlobals(
    { localStorage: fake, window: { dispatchEvent: (event) => events.push(event) } },
    () => storage.set('k', 'v')
  );
  assert.equal(ok, false);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'storage:error');
});

test('an unreadable tab collection is backed up before being replaced', () => {
  const store = new Map([[STORAGE_KEY, '{not json']]);
  const fake = fakeStorage({ store });
  const { state, failed } = withGlobals({ localStorage: fake }, () => loadTabsState());
  assert.equal(failed, true);
  assert.equal(fake.store.get(BACKUP_KEY), '{not json');
  assert.equal(state.tabs.length, 1, 'a fresh default tab is returned');
  assert.equal(state.tabs[0].name, 'Tab 1');
});

test('a readable tab collection is not backed up', () => {
  const saved = { tabs: [{ id: 'a', name: 'A', content: '1' }], activeId: 'a', nextTabNumber: 2 };
  const store = new Map([[STORAGE_KEY, JSON.stringify(saved)]]);
  const fake = fakeStorage({ store });
  const { state, failed } = withGlobals({ localStorage: fake }, () => loadTabsState());
  assert.equal(failed, false);
  assert.equal(fake.store.has(BACKUP_KEY), false);
  assert.equal(state.tabs[0].name, 'A');
});

// A single unusable entry used to throw during load, which aborted boot() and
// left a blank page with no way to reach Reset data.
test('a corrupt entry inside a saved collection cannot break startup', () => {
  const raw = JSON.stringify({ tabs: [null], activeId: null, nextTabNumber: 1 });
  const store = new Map([[STORAGE_KEY, raw]]);
  const fake = fakeStorage({ store });
  const { state, failed } = withGlobals({ localStorage: fake }, () => loadTabsState());
  assert.equal(failed, true);
  assert.equal(fake.store.get(BACKUP_KEY), raw, 'the corrupt payload is kept for recovery');
  assert.equal(state.tabs.length, 1, 'a fresh default tab is returned instead of throwing');
});

// Valid JSON with the wrong shape used to be silently replaced on the next
// write, so the backup had to happen before anything could overwrite it too.
test('a payload that parses but is not a tab collection is backed up', () => {
  const raw = JSON.stringify({ tabs: 'not-an-array' });
  const store = new Map([[STORAGE_KEY, raw]]);
  const fake = fakeStorage({ store });
  const { state, failed } = withGlobals({ localStorage: fake }, () => loadTabsState());
  assert.equal(failed, true);
  assert.equal(fake.store.get(BACKUP_KEY), raw);
  assert.equal(state.tabs.length, 1);
});

test('unusable entries are dropped while the readable ones survive', () => {
  const saved = {
    tabs: [null, { id: 'a', name: 'A', content: '1' }, { content: '2' }],
    activeId: 'a',
  };
  const store = new Map([[STORAGE_KEY, JSON.stringify(saved)]]);
  const fake = fakeStorage({ store });
  const { state, failed } = withGlobals({ localStorage: fake }, () => loadTabsState());
  assert.equal(failed, false, 'the collection as a whole was usable');
  assert.deepEqual(
    state.tabs.map((tab) => tab.name),
    ['A', 'Tab 2']
  );
  assert.ok(state.tabs.every((tab) => typeof tab.id === 'string' && tab.id));
  assert.equal(new Set(state.tabs.map((tab) => tab.id)).size, 2, 'ids stay unique');
  assert.equal(state.activeId, 'a');
  assert.equal(state.nextTabNumber, 3, 'the next name continues past the kept tabs');
});

test('an empty storage slot reports no failure and leaves no backup', () => {
  const fake = fakeStorage();
  const { state, failed } = withGlobals({ localStorage: fake }, () => loadTabsState());
  assert.equal(failed, false);
  assert.equal(fake.store.has(BACKUP_KEY), false);
  assert.equal(state.tabs.length, 1);
  assert.equal(state.tabs[0].content, '');
});
