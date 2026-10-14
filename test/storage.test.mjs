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

// REVIEW.md UID-02 ------------------------------------------------------------

import { createTabsWriter } from '../js/storage/tabsStore.js';

test('UID-02: the writer stamps each saved collection with the time it was saved', () => {
  const fake = fakeStorage();
  const state = { tabs: [{ id: 'a', name: 'A', content: '1' }], activeId: 'a', nextTabNumber: 2 };
  const before = Date.now();
  withGlobals({ localStorage: fake }, () => createTabsWriter(() => state).persist());
  const saved = JSON.parse(fake.store.get(STORAGE_KEY));
  assert.ok(saved.savedAt >= before && saved.savedAt <= Date.now());
  assert.deepEqual(saved.tabs, state.tabs, 'the stamp is added to the collection, not to its tabs');
});

test('UID-02: loading reports when the collection was saved, or null if unknown', () => {
  const read = (saved) =>
    withGlobals(
      { localStorage: fakeStorage({ store: new Map([[STORAGE_KEY, JSON.stringify(saved)]]) }) },
      () => loadTabsState()
    );
  const tabs = [{ id: 'a', name: 'A', content: '1' }];
  assert.equal(read({ tabs, activeId: 'a', savedAt: 1234 }).savedAt, 1234);
  assert.equal(read({ tabs, activeId: 'a' }).savedAt, null, 'a collection from before the stamp');
  assert.equal(read({ tabs, activeId: 'a', savedAt: 'soon' }).savedAt, null, 'a damaged stamp');
});

test('UID-02: the stamp does not leak into the tab state', () => {
  const saved = { tabs: [{ id: 'a', name: 'A', content: '1' }], activeId: 'a', savedAt: 5 };
  const { state } = withGlobals(
    { localStorage: fakeStorage({ store: new Map([[STORAGE_KEY, JSON.stringify(saved)]]) }) },
    () => loadTabsState()
  );
  assert.equal('savedAt' in state, false);
});

test('UID-02: a failed write says whether storage is full or blocked', () => {
  const failure = (fake) => {
    const events = [];
    withGlobals(
      { localStorage: fake, window: { dispatchEvent: (event) => events.push(event) } },
      () => storage.set('k', 'v')
    );
    return events[0].detail;
  };
  const full = failure(
    fakeStorage({
      methods: {
        setItem() {
          throw new Error('QuotaExceededError');
        },
      },
    })
  );
  assert.deepEqual(full, { key: 'k', reason: 'full' });

  const events = [];
  const blocked = {
    get localStorage() {
      throw new Error('SecurityError');
    },
  };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    get: () => blocked.localStorage,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'window', {
    value: { dispatchEvent: (event) => events.push(event) },
    configurable: true,
  });
  try {
    storage.set('k', 'v');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
    delete globalThis.window;
  }
  assert.deepEqual(events[0].detail, { key: 'k', reason: 'blocked' });
});

test('UID-02: the first write that works after a failure announces the recovery', () => {
  let failing = true;
  const fake = fakeStorage({
    methods: {
      setItem(key, value) {
        if (failing) throw new Error('QuotaExceededError');
        fake.store.set(key, String(value));
      },
    },
  });
  const events = [];
  const window = { dispatchEvent: (event) => events.push(event.type) };
  withGlobals({ localStorage: fake, window }, () => {
    storage.set('k', '1');
    storage.set('k', '2');
    failing = false;
    storage.set('k', '3');
    storage.set('k', '4');
  });
  assert.deepEqual(
    events,
    ['storage:error', 'storage:error', 'storage:ok'],
    'once, not on every write'
  );
});
