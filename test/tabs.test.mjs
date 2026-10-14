import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTab,
  closeTab,
  renameTab,
  setActiveTab,
  setContent,
  setCaret,
  normalizeCaret,
  moveTab,
  deriveNextTabNumber,
} from '../js/ui/tabs.js';

function baseState() {
  const a = { id: 'a', name: 'A', content: '1' };
  const b = { id: 'b', name: 'B', content: '2' };
  const c = { id: 'c', name: 'C', content: '3' };
  return { tabs: [a, b, c], activeId: 'a', nextTabNumber: 4 };
}

test('createTab appends a tab and activates it', () => {
  const next = createTab(baseState(), 'Tab 4');
  assert.equal(next.tabs.length, 4);
  assert.equal(next.tabs[3].name, 'Tab 4');
  assert.equal(next.tabs[3].content, '');
  assert.equal(next.activeId, next.tabs[3].id);
  assert.equal(next.nextTabNumber, 5);
});

test('closeTab removes a non-active tab without changing the active tab', () => {
  const next = closeTab(baseState(), 'b');
  assert.equal(next.tabs.length, 2);
  assert.equal(next.activeId, 'a');
  assert.deepEqual(
    next.tabs.map((t) => t.id),
    ['a', 'c']
  );
});

test('closeTab activates the right neighbour when closing the active tab', () => {
  assert.equal(closeTab(baseState(), 'a').activeId, 'b');
  assert.equal(closeTab({ ...baseState(), activeId: 'b' }, 'b').activeId, 'c');
  assert.equal(closeTab({ ...baseState(), activeId: 'c' }, 'c').activeId, 'b');
});

test('closeTab leaves an empty list when the last tab is closed', () => {
  const single = { tabs: [{ id: 'a', name: 'A', content: '' }], activeId: 'a', nextTabNumber: 2 };
  const next = closeTab(single, 'a');
  assert.equal(next.tabs.length, 0);
  assert.equal(next.activeId, null);
});

test('closeTab returns the same state for an unknown id', () => {
  const state = baseState();
  assert.equal(closeTab(state, 'missing'), state);
});

test('renameTab renames only the target tab', () => {
  const next = renameTab(baseState(), 'b', 'Budget');
  assert.equal(next.tabs[1].name, 'Budget');
  assert.equal(next.tabs[0].name, 'A');
});

test('setActiveTab changes the active tab', () => {
  assert.equal(setActiveTab(baseState(), 'c').activeId, 'c');
});

test('setActiveTab returns the same state when already active', () => {
  const state = baseState();
  assert.equal(setActiveTab(state, 'a'), state);
});

test('setContent updates only the target tab', () => {
  const next = setContent(baseState(), 'b', '2 + 2');
  assert.equal(next.tabs[1].content, '2 + 2');
  assert.equal(next.tabs[0].content, '1');
  assert.equal(next.tabs[2].content, '3');
});

test('normalizeCaret accepts only a valid in-range selection', () => {
  assert.deepEqual(normalizeCaret({ start: 2, end: 4 }, 5), { start: 2, end: 4 });
  // A backwards selection is ordered.
  assert.deepEqual(normalizeCaret({ start: 4, end: 2 }, 5), { start: 2, end: 4 });
  assert.deepEqual(normalizeCaret({ start: 5, end: 5 }, 5), { start: 5, end: 5 });
  assert.equal(normalizeCaret({ start: 6, end: 6 }, 5), null);
  assert.equal(normalizeCaret({ start: -1, end: 0 }, 5), null);
  assert.equal(normalizeCaret({ start: 1.5, end: 2 }, 5), null);
  assert.equal(normalizeCaret(null, 5), null);
  assert.equal(normalizeCaret('garbage', 5), null);
});

test('setCaret updates only the target tab and is a no-op when unchanged', () => {
  const next = setCaret(baseState(), 'b', { start: 0, end: 1 });
  assert.deepEqual(next.tabs[1].caret, { start: 0, end: 1 });
  assert.equal(next.tabs[0].caret, undefined);
  assert.equal(setCaret(next, 'b', { start: 0, end: 1 }), next);
});

test('moveTab reorders a tab to an earlier position', () => {
  const next = moveTab(baseState(), 'c', 0);
  assert.deepEqual(
    next.tabs.map((t) => t.id),
    ['c', 'a', 'b']
  );
});

test('moveTab reorders a tab to a later position', () => {
  const next = moveTab(baseState(), 'a', 2);
  assert.deepEqual(
    next.tabs.map((t) => t.id),
    ['b', 'c', 'a']
  );
});

test('moveTab keeps tabs content and the active id', () => {
  const next = moveTab(baseState(), 'b', 0);
  assert.equal(next.activeId, 'a');
  assert.equal(next.tabs[0].content, '2');
});

test('moveTab is a no-op when the position is unchanged', () => {
  const state = baseState();
  assert.equal(moveTab(state, 'b', 1), state);
  assert.equal(moveTab(state, 'missing', 0), state);
});

test('deriveNextTabNumber avoids colliding with existing names', () => {
  assert.equal(deriveNextTabNumber(baseState().tabs), 4);
  const recovered = [
    { id: 'a', name: 'Tab 2', content: '' },
    { id: 'b', name: 'Budget', content: '' },
    { id: 'c', name: 'Tab 9', content: '' },
  ];
  assert.equal(deriveNextTabNumber(recovered), 10);
});

// The reducer path `openSheet` composes: create a named tab, then fill it.
// The DOM wiring lives in js/ui/tabs.js; this covers the state transition an
// imported share link goes through.
test('createTab + setContent adds a named sheet without touching the others', () => {
  const before = baseState();
  const created = createTab(before, 'Shared sheet');
  const next = setContent(created, created.activeId, 'rent = 1200\nsum');

  assert.equal(next.tabs.length, before.tabs.length + 1);
  assert.equal(next.tabs.at(-1).name, 'Shared sheet');
  assert.equal(next.tabs.at(-1).content, 'rent = 1200\nsum');
  assert.equal(next.activeId, next.tabs.at(-1).id, 'the imported sheet becomes active');

  // Every pre-existing tab survives untouched — an import is additive.
  for (const tab of before.tabs) {
    const after = next.tabs.find((entry) => entry.id === tab.id);
    assert.deepEqual(after, tab, `tab ${tab.id} was modified`);
  }
});

// REVIEW.md SEC-01: Restore all and automatic recovery rebuilt the collection
// from snapshots alone, so a tab that was never typed in vanished and the rest
// came back newest-first. A restore merges instead.
import { mergeSnapshots } from '../js/core/tabsState.js';

const snap = (tabId, name, content, timestamp, position) => ({
  tabId,
  name,
  content,
  timestamp,
  position,
});

test('mergeSnapshots keeps the current tabs, their order and the active tab', () => {
  const state = baseState();
  const merged = mergeSnapshots({ ...state, activeId: 'b' }, [snap('c', 'C', 'old c', 5, 2)]);
  assert.deepEqual(
    merged.tabs.map((tab) => tab.id),
    ['a', 'b', 'c']
  );
  assert.equal(merged.activeId, 'b');
  assert.equal(merged.tabs[0].content, '1', 'a tab with no snapshot is kept as it is');
  assert.equal(merged.tabs[2].content, 'old c', 'a tab with a snapshot takes its content');
});

test('mergeSnapshots takes the snapshot name and content, and clears a stale caret', () => {
  const state = {
    tabs: [{ id: 'a', name: 'Now', content: 'new', caret: { start: 2, end: 2 } }],
    activeId: 'a',
    nextTabNumber: 2,
  };
  const [tab] = mergeSnapshots(state, [snap('a', 'Before', 'old', 1, 0)]).tabs;
  assert.equal(tab.name, 'Before');
  assert.equal(tab.content, 'old');
  assert.equal(tab.caret, null);
});

test('mergeSnapshots appends tabs that exist only as snapshots, in their original order', () => {
  const state = { tabs: [{ id: 'a', name: 'A', content: '' }], activeId: 'a', nextTabNumber: 2 };
  const merged = mergeSnapshots(state, [
    snap('z', 'Third', '3', 30, 2),
    snap('y', 'Second', '2', 20, 1),
    snap('x', 'No position, older', 'x', 5, undefined),
    snap('w', 'No position, newer', 'w', 9, undefined),
  ]);
  assert.deepEqual(
    merged.tabs.map((tab) => tab.id),
    ['a', 'y', 'z', 'x', 'w'],
    'by position, then positionless ones oldest first'
  );
});

test('mergeSnapshots repairs the active tab and the tab counter', () => {
  const merged = mergeSnapshots({ tabs: [], activeId: 'gone', nextTabNumber: 1 }, [
    snap('a', 'Tab 7', '7', 1, 0),
    snap('b', 'Budget', 'b', 2, 1),
  ]);
  assert.equal(merged.activeId, 'a');
  assert.equal(merged.nextTabNumber, 8);
});

test('mergeSnapshots can drop a pristine empty tab, but never the last tab', () => {
  const fresh = {
    tabs: [{ id: 'new', name: 'Tab 1', content: '' }],
    activeId: 'new',
    nextTabNumber: 2,
  };
  const recovered = mergeSnapshots(fresh, [snap('a', 'Budget', 'b', 1, 0)], { dropPristine: true });
  assert.deepEqual(
    recovered.tabs.map((tab) => tab.id),
    ['a']
  );
  assert.equal(recovered.activeId, 'a');
  const alone = mergeSnapshots(fresh, [], { dropPristine: true });
  assert.equal(alone.tabs.length, 1, 'an empty collection is never produced');
  const kept = mergeSnapshots(fresh, [snap('a', 'Budget', 'b', 1, 0)]);
  assert.equal(kept.tabs.length, 2, 'without the option nothing is dropped');
});

test('mergeSnapshots never loses a tab that has content', () => {
  const state = baseState();
  const merged = mergeSnapshots(state, [snap('b', 'B', 'x', 1, 1), snap('q', 'Q', 'q', 2, 5)]);
  for (const tab of state.tabs)
    assert.ok(
      merged.tabs.some((t) => t.id === tab.id),
      tab.id
    );
  assert.ok(merged.tabs.some((t) => t.id === 'q'));
});

// REVIEW.md UID-02: after a localStorage write failed, the saved collection is
// older than the snapshots, and a reload used to load it as if it were current.
import { newerSnapshots } from '../js/core/tabsState.js';

test('newerSnapshots finds snapshots saved after the collection, with different content', () => {
  const state = {
    tabs: [
      { id: 'a', name: 'A', content: 'old = 1' },
      { id: 'b', name: 'B', content: 'same' },
    ],
    activeId: 'a',
    nextTabNumber: 3,
  };
  const found = newerSnapshots(
    state,
    [
      snap('a', 'A', 'old = 1\nnew = 2', 200, 0), // newer and different: the lost edit
      snap('b', 'B', 'same', 300, 1), // newer but identical: nothing was lost
      snap('c', 'C', 'whole new tab', 250, 2), // a tab the collection never saved
    ],
    100
  );
  assert.deepEqual(found.map((s) => s.tabId).sort(), ['a', 'c']);
});

test('newerSnapshots ignores snapshots that are not newer than the saved collection', () => {
  const state = { tabs: [{ id: 'a', name: 'A', content: 'x' }], activeId: 'a', nextTabNumber: 2 };
  assert.deepEqual(newerSnapshots(state, [snap('a', 'A', 'y', 100, 0)], 100), []);
  assert.deepEqual(newerSnapshots(state, [snap('a', 'A', 'y', 99, 0)], 100), []);
});

test('newerSnapshots does nothing when the collection never recorded when it was saved', () => {
  const state = { tabs: [{ id: 'a', name: 'A', content: 'x' }], activeId: 'a', nextTabNumber: 2 };
  assert.deepEqual(newerSnapshots(state, [snap('a', 'A', 'y', 999, 0)], null), []);
});

test('newerSnapshots takes a tab’s newest snapshot only', () => {
  const state = { tabs: [{ id: 'a', name: 'A', content: 'x' }], activeId: 'a', nextTabNumber: 2 };
  const found = newerSnapshots(
    state,
    [snap('a', 'A', 'older', 150, 0), snap('a', 'A', 'newest', 180, 0)],
    100
  );
  assert.equal(found.length, 1);
  assert.equal(found[0].content, 'newest');
});
