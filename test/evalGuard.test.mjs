import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEvalGuard, fingerprint, GUARD_KEY } from '../js/storage/evalGuard.js';

// REVIEW.md PRE-01: a sheet that killed the tab must not be evaluated again on
// the next load, or the tab dies on every load.
function memoryStore(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    get: (key) => (data.has(key) ? data.get(key) : null),
    set: (key, value) => (data.set(key, String(value)), true),
    remove: (key) => data.delete(key),
  };
}

test('fingerprints tell sheets apart and are stable', () => {
  assert.equal(fingerprint('1 + 1'), fingerprint('1 + 1'));
  assert.notEqual(fingerprint('1 + 1'), fingerprint('1 + 2'));
  assert.notEqual(fingerprint('a'), fingerprint('a '));
  assert.notEqual(fingerprint(''), fingerprint(' '));
  assert.match(fingerprint('x'), /^1:[0-9a-f]+$/);
});

test('a clean session leaves nothing behind', () => {
  const store = memoryStore();
  const guard = createEvalGuard(store);
  assert.equal(guard.isPaused('ones(3)'), false);
  guard.begin('ones(3)');
  assert.ok(store.data.has(GUARD_KEY), 'the sheet is marked while it runs');
  guard.end();
  assert.equal(store.data.has(GUARD_KEY), false, 'and unmarked when it finishes');
});

test('a page that ended mid-evaluation pauses that sheet on the next load', () => {
  const store = memoryStore();
  const first = createEvalGuard(store);
  first.begin('ones([40000, 40000])');
  // The page dies here: `end` is never called.
  const second = createEvalGuard(store);
  assert.equal(second.isPaused('ones([40000, 40000])'), true);
  assert.equal(second.isPaused('ones([4, 4])'), false, 'only that exact sheet');
  assert.equal(second.isPaused('ones([40000, 40000]) '), false, 'an edit resumes');
});

test('the pause survives further reloads until the sheet changes', () => {
  const store = memoryStore();
  createEvalGuard(store).begin('bad');
  const second = createEvalGuard(store);
  assert.equal(second.isPaused('bad'), true);
  const third = createEvalGuard(store);
  assert.equal(third.isPaused('bad'), true, 'a reload that did not evaluate it stays paused');
});

test('other sheets evaluate normally while one is paused', () => {
  const store = memoryStore();
  createEvalGuard(store).begin('bad');
  const guard = createEvalGuard(store);
  assert.equal(guard.isPaused('good'), false);
  guard.begin('good');
  guard.end();
  assert.equal(guard.isPaused('bad'), true);
});

test('only the most recent paused sheets are remembered', () => {
  const store = memoryStore();
  for (let i = 0; i < 12; i++) {
    createEvalGuard(store).begin(`sheet ${i}`);
  }
  const guard = createEvalGuard(store);
  assert.equal(guard.isPaused('sheet 11'), true);
  assert.equal(guard.isPaused('sheet 0'), false, 'the oldest is forgotten');
});

test('a damaged marker is ignored rather than breaking startup', () => {
  for (const junk of ['{not json', '[]', 'null', '{"running": 5, "paused": "x"}']) {
    const guard = createEvalGuard(memoryStore({ [GUARD_KEY]: junk }));
    assert.equal(guard.isPaused('anything'), false, junk);
  }
});
