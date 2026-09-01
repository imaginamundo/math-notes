import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTab,
  closeTab,
  renameTab,
  setActiveTab,
  setContent,
  moveTab,
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
