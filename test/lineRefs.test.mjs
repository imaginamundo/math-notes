import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveLineRefs } from '../js/core/lineRefs.js';

const parsed = (code, rhs = '') => ({ code, rhs, label: '', isAssignment: Boolean(rhs) });
const value = (v) => ({ type: 'value', value: v });

test("line(n) becomes a token bound to that line's value", () => {
  const out = resolveLineRefs(parsed('line(1) + line(2)'), [value(10), value(5)], 2);
  assert.equal(out.error, null);
  assert.equal(out.parsed.code, '(__line_1) + (__line_2)');
  assert.deepEqual(out.values, { __line_1: 10, __line_2: 5 });
});

test('whitespace inside the reference is accepted', () => {
  const out = resolveLineRefs(parsed('line ( 1 )'), [value(3)], 1);
  assert.equal(out.error, null);
  assert.equal(out.parsed.code, '(__line_1)');
});

test('an assignment rewrites its right-hand side too', () => {
  const out = resolveLineRefs(parsed('x = line(1) * 2', 'line(1) * 2'), [value(4)], 1);
  assert.equal(out.parsed.rhs, '(__line_1) * 2');
  assert.deepEqual(out.values, { __line_1: 4 });
});

test('a line before the first does not exist', () => {
  const out = resolveLineRefs(parsed('line(0)'), [value(1)], 1);
  assert.equal(out.error, 'Line 0 does not exist');
});

test('a reference at or below the current line is rejected', () => {
  assert.equal(
    resolveLineRefs(parsed('line(3)'), [value(1), value(2)], 1).error,
    'Line 3 is below this line'
  );
  // index is the current line's zero-based position, so line(index + 1) is itself
  assert.equal(
    resolveLineRefs(parsed('line(2)'), [value(1), value(2)], 1).error,
    'Line 2 is below this line'
  );
});

test('a reference to a row without a value is rejected', () => {
  const rows = [{ type: 'error', value: 'boom' }, value(undefined), value(() => 1), undefined];
  for (const n of [1, 2, 3, 4]) {
    assert.equal(resolveLineRefs(parsed(`line(${n})`), rows, 4).error, `Line ${n} has no value`);
  }
});

test('only the first error is reported and later references are left alone', () => {
  const out = resolveLineRefs(parsed('line(9) + line(1)'), [value(1)], 1);
  assert.equal(out.error, 'Line 9 is below this line');
  assert.equal(out.parsed.code, 'line(9) + line(1)');
});

test('text without a reference is returned unchanged', () => {
  const out = resolveLineRefs(parsed('timeline(1) + 2'), [value(1)], 1);
  assert.equal(out.error, null);
  assert.equal(out.parsed.code, 'timeline(1) + 2');
  assert.deepEqual(out.values, {});
});

test('a value of zero is still a value', () => {
  const out = resolveLineRefs(parsed('line(1)'), [value(0)], 1);
  assert.equal(out.error, null);
  assert.deepEqual(out.values, { __line_1: 0 });
});

test('SHEET-07: a unit or digit right after line(n) is a separate factor', async () => {
  const { evaluateLines } = await import('../js/core/calculate.js');
  const row = (lines, i) => evaluateLines(lines).results[i];
  assert.equal(row(['5', 'line(1)km'], 1).value.toNumeric('km'), 5);
  assert.equal(row(['5', 'line(1)2'], 1).value, 10);
  assert.equal(row(['5', 'line(1) km'], 1).value.toNumeric('km'), 5);
});
