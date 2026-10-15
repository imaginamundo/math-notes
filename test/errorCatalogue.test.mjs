import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/core/calculate.js';
import { FIXTURE_RATES } from './helpers/rates.mjs';

// The messages a person reads for common mistakes: short, impersonal, in the user's words,
// and never mathjs internals (function names like addScalar, `(char N)`, `__helpers`).
const engine = () => createEngine({ rates: FIXTURE_RATES });
const message = (...lines) => {
  const row = engine().evaluateLines(lines).results.at(-1);
  assert.equal(row.type, 'error', `${lines.at(-1)} should be an error`);
  return String(row.value);
};

test('a plain number and a unit', () => {
  for (const line of ['5 kg + 3', '3 + 5 kg', '5 USD + 3', '2 hours + 30']) {
    assert.match(message(line), /plain number and a unit/, line);
  }
});

test('a function written without parentheses', () => {
  assert.match(message('sqrt 4'), /"sqrt" is a function; write its value in parentheses/);
  assert.match(message('log 8'), /"log" is a function/);
  assert.match(message('abs -3'), /"abs" is a function/);
});

test('a function with the wrong number of values', () => {
  assert.match(message('sin()'), /sin needs a value/);
  assert.equal(message('sin(1, 2)'), 'sin takes 1 value, not 2');
  assert.match(message('sin(5 m)'), /angle/);
});

test('a bad conversion target and a unit on its own', () => {
  assert.match(message('100 USD to E'), /needs a unit after it/);
  assert.match(message('5 to 5'), /needs a unit after it/);
  assert.match(message('-kg'), /no amount/);
  assert.match(message('kg + kg'), /no amount/);
});

test('a conversion between things that do not match is one message', () => {
  assert.equal(message('1/3 kg to m'), 'Cannot convert "kg" to "m"');
  assert.equal(
    message('1e20 kg to m'),
    'Cannot convert "Zg" to "m"'.replace('Zg', 'kg').replace(/^/, '') || ''
  );
});

test('a date used where a duration is needed', () => {
  assert.match(message('start = 10 June', 'start + 2'), /duration/);
});

test('a name nobody defined is named, with the same wording everywhere', () => {
  assert.equal(message('foo + 1'), '"foo" is not defined');
  assert.equal(message('5 kg in zorkmids'), '"zorkmids" is not defined');
  assert.equal(message('2 kg apples'), '"apples" is not defined');
  assert.equal(message('5 EUR in dollars'), '"dollars" is not defined');
  assert.equal(message('5 kg to ZZZ'), '"ZZZ" is not defined');
  assert.equal(message('foo(3)'), '"foo" is not a known function');
  assert.equal(message('monthly rent * 12'), '"monthly rent" is not defined');
});

test('line() with something other than a line number', () => {
  assert.match(message('x = 5', 'line(x)'), /line\(\) needs a whole line number/);
  assert.match(message('line(-1)'), /line\(\) needs a whole line number/);
});

test('no message carries mathjs internals', () => {
  for (const line of [
    '5 kg + 3',
    'sqrt 4',
    'sin()',
    '3 + 5 kg',
    '[1, 2',
    '(2 +',
    'x = 2',
    '{1: 2}',
  ]) {
    const row = engine().evaluateLines([line]).results[0];
    if (row.type !== 'error') continue;
    assert.doesNotMatch(String(row.value), /Scalar|\(char \d+\)|__|matrix/i, line);
  }
});

test('a time that cannot exist is reported as one', () => {
  for (const line of [
    '25:00',
    '9:75',
    '12:60',
    '25:00 am',
    '9:75 pm',
    '25:00 + 2 hours',
    '24:30 to 25:00',
    '25:00 - 9:00',
  ]) {
    assert.match(message(line), /is not a valid time/, line);
  }
  const valid = engine().evaluateLines(['9:45', '23:59', '0:00', '1:30 + 1 hour']).results;
  for (const row of valid) assert.equal(row.type, 'value');
});

test('the same problem reads the same wherever it is reported', () => {
  assert.equal(message('June 31'), '"June 31" is not a valid date');
  assert.equal(
    message('5 USD', '3 EUR', '2 BRL', 'sum'),
    'Cannot combine "USD", "EUR" and "BRL" — convert them first'
  );
});

test('quoted text next to a value says how to write a comment', () => {
  for (const line of ['$275 "deposit"', '10 "dinner"']) {
    assert.match(message(line), /start a comment with #/, line);
  }
});
