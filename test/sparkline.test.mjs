import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sparkline, LEVELS } from '../js/render/sparkline.js';

test('sparkline maps a rising ramp across the full range of levels', () => {
  const line = sparkline([0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(line, LEVELS.join(''));
  assert.equal(line.length, 8);
});

test('sparkline puts the minimum at the bottom and the maximum at the top', () => {
  const line = sparkline([5, 1, 9]);
  assert.equal(line[0], LEVELS[Math.round((4 / 8) * 7)]);
  assert.equal(line[1], LEVELS[0]);
  assert.equal(line[2], LEVELS[LEVELS.length - 1]);
});

test('sparkline draws a flat series as a mid-level row, not a divide by zero', () => {
  const line = sparkline([3, 3, 3, 3]);
  assert.equal(line, LEVELS[4].repeat(4));
  assert.equal(line.includes('NaN'), false);
});

test('sparkline handles negatives and mixed signs', () => {
  const line = sparkline([-10, 0, 10]);
  assert.equal(line, `${LEVELS[0]}${LEVELS[Math.round(3.5)]}${LEVELS[7]}`);
});

test('sparkline drops NaN and Infinity instead of poisoning the range', () => {
  const clean = sparkline([1, 2, 3, 4]);
  assert.equal(sparkline([1, NaN, 2, Infinity, 3, -Infinity, 4]), clean);
});

test('sparkline ignores non-numeric entries', () => {
  const clean = sparkline([1, 2, 3]);
  assert.equal(sparkline([1, 'x', 2, null, 3, undefined, {}]), clean);
});

test('sparkline returns an empty string when there is nothing to draw', () => {
  for (const input of [[], [1], [1, 2], [NaN, NaN, NaN], null, undefined, 'nope', 42, {}]) {
    assert.equal(sparkline(input), '', `input: ${JSON.stringify(input)}`);
  }
});

test('sparkline downsamples a long series to the requested width', () => {
  const values = Array.from({ length: 500 }, (_, i) => i);
  assert.equal(sparkline(values).length, 24);
  assert.equal(sparkline(values, 8).length, 8);
});

test('downsampling averages each bucket, so a spike is not sampled away', () => {
  // A single spike sitting between the sampled indices of a naive
  // every-nth-item downsample.
  const values = new Array(100).fill(0);
  values[37] = 1000;
  const line = sparkline(values, 10);
  assert.ok(line.includes(LEVELS[LEVELS.length - 1]), `spike was lost: ${line}`);
});

test('sparkline output is only block characters', () => {
  const line = sparkline([1, 5, 2, 8, 3]);
  for (const character of line) {
    assert.ok(LEVELS.includes(character), `unexpected character: ${character}`);
  }
});
