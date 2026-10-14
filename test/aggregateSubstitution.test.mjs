import { test } from 'node:test';
import assert from 'node:assert/strict';
import { substituteAggregates } from '../js/core/aggregateSubstitution.js';
import parseLine from '../js/core/parseLine.js';

const run = (line, variables = {}) => substituteAggregates(parseLine(line), 10, 2.5, variables);

test('sum and total take the block sum, average and avg its average', () => {
  const out = run('sum + total + average + avg');
  assert.equal(out.parsed.code, '__agg_0 + __agg_1 + __agg_2 + __agg_3');
  assert.deepEqual(out.values, { __agg_0: 10, __agg_1: 10, __agg_2: 2.5, __agg_3: 2.5 });
});

test('the keyword is matched whatever its case', () => {
  const out = run('SUM * Average');
  assert.deepEqual(out.values, { __agg_0: 10, __agg_1: 2.5 });
});

test('a keyword that is a function call is left alone', () => {
  const out = run('sum(1, 2) + sum');
  assert.equal(out.parsed.code, 'sum(1, 2) + __agg_0');
  assert.deepEqual(out.values, { __agg_0: 10 });
});

test('a keyword inside a longer word is left alone', () => {
  const out = run('summary + total_cost + subtotal');
  assert.equal(out.parsed.code, 'summary + total_cost + subtotal');
  assert.deepEqual(out.values, {});
});

test('a variable the user defined shadows the keyword', () => {
  const out = run('total * 2', { total: 7 });
  assert.equal(out.parsed.code, 'total * 2');
  assert.deepEqual(out.values, {});
});

test('a keyword is a value, so it keeps precedence', () => {
  const out = run('sum ^ 2');
  assert.equal(out.parsed.code, '__agg_0 ^ 2');
});

test('an assignment rewrites its right-hand side and keeps its label', () => {
  const out = run('grand = sum + 1');
  assert.equal(out.parsed.code, 'grand = __agg_0 + 1');
  assert.equal(out.parsed.rhs, '__agg_0 + 1');
  assert.deepEqual(out.values, { __agg_0: 10 });
});

test('a line without a keyword is returned as it was', () => {
  const parsed = parseLine('2 + 2');
  const out = substituteAggregates(parsed, 1, 1, {});
  assert.equal(out.parsed.code, parsed.code);
  assert.deepEqual(out.values, {});
});
