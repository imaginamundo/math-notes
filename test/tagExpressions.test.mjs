import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';
import parseLine from '../js/core/parseLine.js';
import { FIXTURE_RATES } from './helpers/rates.mjs';

// A `#tag` at the end of a calculation was read as the line's label (`2 * #food`
// was `2 *` tagged food), and an operator after a tag request multiplied by the block
// sum (`sum #food * 2` gave 5,000).
const show = (lines, index = lines.length - 1) => {
  const row = createEngine({ rates: FIXTURE_RATES }).evaluateLines(lines).results[index];
  return row.type === 'error' ? `ERR ${row.value}` : formatResult(row.value);
};
const food = ['10 #food', '20 #food', '5 #drink'];

test('a tag as the last operand of a calculation is its value', () => {
  assert.equal(show([...food, '5 + #food']), '35');
  assert.equal(show([...food, '100 - #food']), '70');
  assert.equal(show([...food, '2 * #food']), '60');
  assert.equal(show([...food, 'x = #food', 'x']), '30');
  assert.equal(show([...food, '-#food']), '-30');
  assert.equal(show([...food, '20% of #food']), '6');
  assert.equal(show([...food, 'budget = 100', 'remaining = budget - #food', 'remaining']), '70');
  assert.equal(show([...food, '5 + #food # a note']), '35');
  assert.equal(show([...food, '5 + #food #other']), '35');
});

test('the remainder operator before a tag does not add to the tag', () => {
  const rows = createEngine().evaluateLines([...food, '5 % #food', '#food']).results;
  assert.equal(formatResult(rows[3].value), '5');
  assert.equal(formatResult(rows[4].value), '30', 'the tag is still 30');
});

test('a tag after an operator in a labelled line is still its value', () => {
  assert.equal(show([...food, 'Total: 5 + #food']), '35');
});

test('lines that really are tagged keep their tags', () => {
  const tagged = (line) => parseLine(line).valid;
  assert.equal(tagged('20 #food'), true);
  assert.equal(tagged('lunch = 12 #food'), true);
  assert.equal(tagged('Lunch: 12 #food #urgent'), true);
  assert.equal(tagged('100 * 20% #food'), true);
  assert.equal(tagged('(2 + 3) #food'), true);
  assert.equal(tagged('#food'), true);
  assert.equal(tagged('sum #food'), true);
  assert.equal(tagged('sum of #food'), true);
  assert.equal(tagged('5 + #food'), false);
  assert.equal(tagged('x = #food'), false);
  assert.equal(tagged('2 * #food'), false);
  assert.equal(tagged('5 to #food'), false);
});

test('an operator after a tag request applies to the request', () => {
  assert.equal(show([...food, 'sum #food * 2']), '60');
  assert.equal(show([...food, 'avg #food * 2']), '30');
  assert.equal(show([...food, 'average #food + 1']), '16');
  assert.equal(show([...food, 'sum of #food * 2']), '60');
  assert.equal(show([...food, '#food #drink * 2']), '70');
  assert.equal(show([...food, '#food #drink + 1']), '36');
  assert.equal(show([...food, '(sum #food) * 2']), '60');
  assert.equal(show([...food, 'x = sum #food * 2', 'x']), '60');
  assert.equal(show([...food, '#food #food * 2']), '60', 'the same tag twice counts once');
});

test('plain requests and single-tag expressions are unchanged', () => {
  assert.equal(show([...food, '#food']), '30');
  assert.equal(show([...food, 'sum #food']), '30');
  assert.equal(show([...food, '#food #drink']), '35');
  assert.equal(show([...food, '#food * 2']), '60');
  assert.equal(show([...food, '#food + #drink']), '35');
  assert.equal(show([...food, '#food + 20%']), '36');
});

test('the request keyword does not leak the block sum into the expression', () => {
  // The block above holds 35 plus the request rows; the keyword must not be read as it.
  assert.equal(show(['100', ...food, 'sum #food * 2']), '60');
  assert.equal(show(['', ...food, 'sum #food * 2']), '60');
  assert.match(show(['1 #a', 'sum #missing * 2']), /No values tagged #missing/);
});
