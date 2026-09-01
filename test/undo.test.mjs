import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordChange, commitDraft, applyUndo, applyRedo } from '../js/ui/tabs.js';

const empty = () => ({ undo: [], redo: [], draft: null });

test('recordChange starts a draft on the first edit of a burst', () => {
  const entry = recordChange(empty(), 'a', 'ab');
  assert.deepEqual(entry, { undo: [], redo: [], draft: 'a' });
});

test('recordChange ignores unchanged input', () => {
  const entry = empty();
  assert.equal(recordChange(entry, 'a', 'a'), entry);
});

test('recordChange keeps the draft while typing continues', () => {
  const first = recordChange(empty(), 'a', 'ab');
  const second = recordChange(first, 'ab', 'abc');
  assert.deepEqual(second, { undo: [], redo: [], draft: 'a' });
});

test('commitDraft turns the burst into one undo step', () => {
  const burst = commitDraft(recordChange(recordChange(empty(), 'a', 'ab'), 'ab', 'abc'));
  assert.deepEqual(burst, { undo: ['a'], redo: [], draft: null });
});

test('applyUndo restores the previous value and seeds redo', () => {
  let entry = empty();
  entry = commitDraft(recordChange(entry, 'a', 'ab'));
  entry = commitDraft(recordChange(entry, 'ab', 'abc'));
  const result = applyUndo(entry, 'abc');
  assert.equal(result.value, 'ab');
  assert.deepEqual(result.entry.undo, ['a']);
  assert.deepEqual(result.entry.redo, ['abc']);
});

test('applyRedo restores forward', () => {
  let entry = empty();
  entry = commitDraft(recordChange(entry, 'a', 'ab'));
  entry = commitDraft(recordChange(entry, 'ab', 'abc'));
  const undone = applyUndo(entry, 'abc');
  const redone = applyRedo(undone.entry, undone.value);
  assert.equal(redone.value, 'abc');
  assert.deepEqual(redone.entry.undo, ['a', 'ab']);
  assert.deepEqual(redone.entry.redo, []);
});

test('applyUndo and applyRedo return null when nothing is left', () => {
  assert.equal(applyUndo(empty(), 'abc'), null);
  assert.equal(applyRedo(empty(), 'abc'), null);
});

test('a new edit after undo clears redo', () => {
  let entry = empty();
  entry = commitDraft(recordChange(entry, 'a', 'ab'));
  entry = commitDraft(recordChange(entry, 'ab', 'abc'));
  const undone = applyUndo(entry, 'abc');
  const edited = commitDraft(recordChange(undone.entry, undone.value, 'abx'));
  assert.deepEqual(edited.redo, []);
});
