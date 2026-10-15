import { test } from 'node:test';
import assert from 'node:assert/strict';
import { create, all } from '../js/lib/math.bundle.min.js';
import { friendlyError } from '../js/core/friendlyErrors.js';

const math = create(all);
const err = (message) => new Error(message);
const CONVERSION =
  'Unexpected type of argument in function to (expected: string or Unit, actual: number, index: 1)';

test('an unrelated message is passed through', () => {
  assert.equal(
    friendlyError(math, err('Something odd happened'), '2 +', {}),
    'Something odd happened'
  );
});

test('a non-Error is stringified', () => {
  assert.equal(friendlyError(math, 'plain failure', '', {}), 'plain failure');
  assert.equal(friendlyError(math, undefined, '', {}), 'undefined');
});

test('a single unknown symbol keeps the mathjs wording', () => {
  assert.equal(friendlyError(math, err('Undefined symbol x'), 'x + 1', {}), '"x" is not defined');
});

test('an unknown multi-word name is reported as the whole phrase', () => {
  assert.equal(
    friendlyError(math, err('Undefined symbol monthly'), 'monthly rent + 5', {}),
    '"monthly rent" is not defined'
  );
});

test('a mangled forward reference is shown by its original name', () => {
  assert.equal(
    friendlyError(math, err('Undefined symbol __var_monthly_rent'), '__var_monthly_rent', {}),
    '"monthly rent" is not defined'
  );
});

test('a phrase containing a defined variable is not rewritten', () => {
  assert.equal(
    friendlyError(math, err('Undefined symbol monthly'), 'monthly rent', { rent: 1 }),
    '"monthly" is not defined'
  );
});

test('a phrase containing a mathjs name is not rewritten', () => {
  assert.equal(
    friendlyError(math, err('Undefined symbol foo'), 'foo sqrt', {}),
    '"foo" is not defined'
  );
});

test('a variable used as a conversion target is named in the message', () => {
  const message = friendlyError(math, err(CONVERSION), '5km to m', { m: 3 });
  assert.equal(
    message,
    '"m" is a variable, so it cannot be a unit here; rename it to convert to m'
  );
});

test('the conversion message needs a variable, not a unit, behind the target', () => {
  const plain = '"to" needs a unit after it, like km or USD';
  assert.equal(friendlyError(math, err(CONVERSION), '5km to m', {}), plain);
  assert.equal(friendlyError(math, err(CONVERSION), '5km to m', { m: math.unit(1, 'm') }), plain);
  assert.equal(friendlyError(math, err(CONVERSION), '5km to m', { m: null }), plain);
});

test('a conversion error without a `to` target is passed through', () => {
  assert.match(friendlyError(math, err(CONVERSION), 'to(5, 3)', { m: 3 }), /needs a unit/);
});

test('a date given to an operator that cannot take one reads as a sentence', () => {
  const date = (fn, index) =>
    err(
      `Unexpected type of argument in function ${fn} (expected: number, actual: Date, index: ${index})`
    );
  assert.match(friendlyError(math, date('addScalar', 1), '5 + today', {}), /duration/);
  assert.match(friendlyError(math, date('multiplyScalar', 0), 'today * 5', {}), /multiplied/);
  assert.match(friendlyError(math, date('to', 1), '5 to today', {}), /converted/);
  assert.match(friendlyError(math, date('sin', 0), 'sin(today)', {}), /needs a number, not a date/);
});
