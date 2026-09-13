import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INDENT, indentSelection, outdentSelection } from '../js/ui/indent.js';

test('Tab with no selection inserts the indent unit', () => {
  assert.deepEqual(indentSelection('a = 1', 0, 0), {
    value: `${INDENT}a = 1`,
    start: INDENT.length,
    end: INDENT.length,
  });
  assert.deepEqual(indentSelection('a = 1', 5, 5), {
    value: `a = 1${INDENT}`,
    start: 5 + INDENT.length,
    end: 5 + INDENT.length,
  });
});

test('Tab with a selection indents every touched line', () => {
  const value = 'a\nb\nc';
  const result = indentSelection(value, 0, value.length);
  assert.equal(result.value, `${INDENT}a\n${INDENT}b\n${INDENT}c`);
  assert.equal(result.start, 0, 'the selection keeps covering the indentation');
  assert.equal(result.end, value.length + INDENT.length * 3);
});

test('a selection ending at a line start does not indent that line', () => {
  const value = 'a\nb\nc';
  const result = indentSelection(value, 0, 2); // "a\n"
  assert.equal(result.value, `${INDENT}a\nb\nc`);
});

test('Shift+Tab outdents selected lines by up to one unit', () => {
  const value = `${INDENT}a\n${INDENT}b`;
  const result = outdentSelection(value, 0, value.length);
  assert.equal(result.value, 'a\nb');
});

test('outdent removes at most one unit of leading spaces', () => {
  const result = outdentSelection(`${INDENT}${INDENT}a`, 0, 0);
  assert.equal(result.value, `${INDENT}a`);
});

test('Shift+Tab with no selection outdents the caret line and keeps the column', () => {
  const value = `${INDENT}a + b`;
  const result = outdentSelection(value, 5, 5);
  assert.equal(result.value, 'a + b');
  assert.equal(result.start, 3);
  assert.equal(result.end, 3);
});

test('outdent leaves an unindented line alone', () => {
  const value = 'a\nb';
  const result = outdentSelection(value, 2, 2);
  assert.deepEqual(result, { value, start: 2, end: 2 });
});
