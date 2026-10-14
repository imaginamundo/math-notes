import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';
import { FIXTURE_RATES } from './helpers/rates.mjs';

// A phrase is a rewrite of one expression. It has to work wherever an expression
// can stand: the body of a function definition, inside parentheses, as a call
// argument, and not only as the whole bare line.
const show = (lines, index = lines.length - 1) => {
  const row = createEngine({ rates: FIXTURE_RATES }).evaluateLines(lines).results[index];
  return row.type === 'error' ? `ERR ${row.value}` : formatResult(row.value);
};

test('a phrase works in the body of a function definition', () => {
  assert.equal(show(['pay = py(h) = h at $20/hour', 'pay(3 hours)']), 'US$ 60');
  assert.equal(show(['r2 = rd(x) = x to 2 dp', 'r2(pi)']), '3.14');
  assert.equal(show(['share = sh(x) = x as a % of 200', 'share(50)']), '25');
  assert.equal(show(['fl = flo(n) = n kg in liters', 'fl(2)']), '2 liters');
  assert.equal(show(['p = f(x) = x rounded', 'p(2.6)']), '3');
});

test('a phrase works inside parentheses and call arguments', () => {
  assert.equal(show(['(300g butter in cups) * 2']), '2.634… cups');
  assert.equal(show(['(100 km at 10 km/hour) * 2']), '20 hours');
  assert.equal(show(['(5.5 minutes as timespan) * 2']), '11 min');
  assert.equal(show(['x = (100 km at 10 km/hour)', 'x']), '10 hours');
  assert.equal(show(['max(1, (3.456 to 2 dp))']), '3.46');
  assert.equal(show(['sum(1,000, 2,000)']), '3,000');
});

test('plain arithmetic and groups are unchanged', () => {
  assert.equal(show(['(1 + 2) * 3']), '9');
  assert.equal(show(['sqrt(16) + max(1, 2)']), '6');
  assert.equal(show(['a = 5', 'f = g(x) = x * a', 'f(2)'], 2), '10');
  assert.equal(show(['(10% of 50) * 2']), '10');
  assert.equal(show(['(100 + 5%) * 2']), '210');
});
