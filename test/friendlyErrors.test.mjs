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
    friendlyError(math, err('Parenthesis ) expected'), '2 +', {}),
    'Parenthesis ) expected'
  );
});

test('a non-Error is stringified', () => {
  assert.equal(friendlyError(math, 'plain failure', '', {}), 'plain failure');
  assert.equal(friendlyError(math, undefined, '', {}), 'undefined');
});

test('a single unknown symbol keeps the mathjs wording', () => {
  assert.equal(friendlyError(math, err('Undefined symbol x'), 'x + 1', {}), 'Undefined symbol x');
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
    'Undefined symbol monthly'
  );
});

test('a phrase containing a mathjs name is not rewritten', () => {
  assert.equal(
    friendlyError(math, err('Undefined symbol foo'), 'foo sqrt', {}),
    'Undefined symbol foo'
  );
});

test('a variable used as a conversion target is named in the message', () => {
  const message = friendlyError(math, err(CONVERSION), '5km to m', { m: 3 });
  assert.match(message, /^"m" is a variable, so it cannot be used as a unit in a conversion/);
  assert.match(message, /Rename the variable to convert to m\.$/);
});

test('the conversion message needs a variable, not a unit, behind the target', () => {
  assert.equal(friendlyError(math, err(CONVERSION), '5km to m', {}), CONVERSION);
  assert.equal(
    friendlyError(math, err(CONVERSION), '5km to m', { m: math.unit(1, 'm') }),
    CONVERSION
  );
  assert.equal(friendlyError(math, err(CONVERSION), '5km to m', { m: null }), CONVERSION);
});

test('a conversion error without a `to` target is passed through', () => {
  assert.equal(friendlyError(math, err(CONVERSION), 'to(5, 3)', { m: 3 }), CONVERSION);
});
