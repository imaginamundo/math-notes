import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plotPath, niceNumber } from '../js/render/plot.js';

const ramp = (from, to, count) =>
  Array.from({ length: count }, (_, i) => {
    const x = from + ((to - from) * i) / (count - 1);
    return [x, x * 2];
  });

test('plotPath maps a straight line across the full viewport', () => {
  const { d, bounds } = plotPath(ramp(-10, 10, 5), 640, 320);
  assert.deepEqual(bounds, { minX: -10, maxX: 10, minY: -20, maxY: 20 });
  // First point at the bottom-left, last at the top-right (SVG y is flipped).
  assert.ok(d.startsWith('M0 320'), d);
  assert.ok(d.endsWith('L640 0'), d);
});

test('plotPath emits a move then only line commands', () => {
  const { d } = plotPath(ramp(0, 4, 5), 100, 50);
  const commands = d.split(' ').filter((token) => /^[ML]/.test(token));
  assert.equal(commands.length, 5);
  assert.equal(commands.filter((token) => token.startsWith('M')).length, 1);
  assert.ok(d.startsWith('M'));
});

test('the path never contains a non-finite number', () => {
  for (const points of [
    ramp(-1, 1, 9),
    [[0, 0]],
    [
      [0, 5],
      [1, 5],
      [2, 5],
    ],
    [
      [-1, -1],
      [0, 0],
      [1, 1],
    ],
  ]) {
    const { d } = plotPath(points, 640, 320);
    assert.equal(/NaN|Infinity|undefined/.test(d), false, `bad path: ${d}`);
  }
});

test('a constant series is drawn as a centred flat line, not collapsed', () => {
  const { d, bounds } = plotPath(
    [
      [0, 7],
      [1, 7],
      [2, 7],
    ],
    640,
    320
  );
  assert.deepEqual(bounds, { minX: 0, maxX: 2, minY: 6, maxY: 8 });
  assert.equal(d, 'M0 160 L320 160 L640 160');
});

test('a single point is padded on both axes instead of dividing by zero', () => {
  const { d, bounds } = plotPath([[3, 4]], 640, 320);
  assert.deepEqual(bounds, { minX: 2, maxX: 4, minY: 3, maxY: 5 });
  assert.equal(d, 'M320 160');
});

test('the zero axis is drawn only when the range spans zero', () => {
  assert.equal(plotPath(ramp(-5, 5, 5), 640, 320).zeroY, 160);
  assert.equal(
    plotPath(
      [
        [0, 1],
        [1, 2],
        [2, 3],
      ],
      640,
      320
    ).zeroY,
    null,
    'all-positive series needs no zero axis'
  );
  assert.equal(
    plotPath(
      [
        [0, -3],
        [1, -2],
        [2, -1],
      ],
      640,
      320
    ).zeroY,
    null,
    'all-negative series needs no zero axis'
  );
});

test('plotPath drops non-finite points rather than emitting them', () => {
  const { d } = plotPath(
    [[0, 0], [1, NaN], [2, 2], [Infinity, 3], [4, 4], 'not a point', [5]],
    100,
    100
  );
  assert.equal(/NaN|Infinity/.test(d), false, d);
  assert.equal(d.split('L').length, 3, `expected 3 kept points, got: ${d}`);
});

test('plotPath returns an empty result for an empty or unusable series', () => {
  for (const points of [[], null, undefined, 'nope', [[NaN, NaN]]]) {
    const result = plotPath(points, 640, 320);
    assert.equal(result.d, '');
    assert.deepEqual(result.xTicks, []);
    assert.equal(result.zeroY, null);
  }
});

test('axis ticks span the bounds and carry printable labels', () => {
  const { xTicks, yTicks } = plotPath(ramp(-10, 10, 5), 640, 320);
  assert.equal(xTicks.length, 5);
  assert.equal(xTicks[0].value, -10);
  assert.equal(xTicks[4].value, 10);
  assert.equal(xTicks[0].position, 0);
  assert.equal(xTicks[4].position, 640);
  for (const tick of [...xTicks, ...yTicks]) {
    assert.equal(/NaN|Infinity/.test(tick.label), false, tick.label);
    assert.ok(tick.label.length > 0);
  }
});

test('niceNumber keeps labels short', () => {
  assert.equal(niceNumber(1.23456789), '1.235');
  assert.equal(niceNumber(0), '0');
  assert.equal(niceNumber(-42), '-42');
  assert.equal(niceNumber(1e9), '1.00e+9');
  assert.equal(niceNumber(NaN), '');
});
