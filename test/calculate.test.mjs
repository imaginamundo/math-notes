import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLines, evaluateLine, sampleFunction, MAX_SAMPLES } from '../js/core/calculate.js';
import parseLine from '../js/core/parseLine.js';

test('parseLine splits a plain expression', () => {
  const parsed = parseLine('1 + 1');
  assert.deepEqual(parsed, {
    code: '1 + 1',
    comment: '',
    label: '',
    rhs: '',
    isAssignment: false,
    equalsIndex: -1,
    title: '',
    rawCode: '1 + 1',
    titleIndex: -1,
  });
});

test('parseLine detects an assignment', () => {
  const parsed = parseLine('pizzas = 2');
  assert.equal(parsed.isAssignment, true);
  assert.equal(parsed.label, 'pizzas');
  assert.equal(parsed.rhs, '2');
});

test('parseLine separates comments', () => {
  const parsed = parseLine('2 + 2 # my note');
  assert.equal(parsed.code, '2 + 2 ');
  assert.equal(parsed.comment, '# my note');
});

test('parseLine handles assignment with a comment', () => {
  const parsed = parseLine('x = 5 # done');
  assert.equal(parsed.label, 'x');
  assert.equal(parsed.rhs, '5');
  assert.equal(parsed.comment, '# done');
});

test('parseLine keeps chained equals in the rhs', () => {
  assert.equal(parseLine('a = b = 3').rhs, 'b = 3');
});

test('parseLine detects a function assignment', () => {
  const parsed = parseLine('f = f(x) = x * 2');
  assert.equal(parsed.isAssignment, true);
  assert.equal(parsed.label, 'f');
  assert.equal(parsed.rhs, 'f(x) = x * 2');
});

test('parseLine does not treat an empty rhs as assignment', () => {
  assert.equal(parseLine('x =').isAssignment, false);
  assert.equal(parseLine('= 5').isAssignment, false);
});

test('parseLine handles a comment-only line', () => {
  const parsed = parseLine('# hi');
  assert.equal(parsed.code, '');
  assert.equal(parsed.comment, '# hi');
});

test('parseLine splits a colon label from the expression', () => {
  const parsed = parseLine('Price: 10 + 5');
  assert.equal(parsed.title, 'Price');
  assert.equal(parsed.code, '10 + 5');
  assert.equal(parsed.isAssignment, false);
});

test('parseLine rejects numeric colon prefixes as labels', () => {
  assert.equal(parseLine('2:30').title, '');
});

test('parseLine keeps an equals sign before the colon out of the label', () => {
  const parsed = parseLine('a: b = 3');
  assert.equal(parsed.title, 'a');
  assert.equal(parsed.code, 'b = 3');
  assert.equal(parsed.isAssignment, true);
});

test('evaluateLines evaluates the expression after a colon label', () => {
  const { results } = evaluateLines(['Price: 10 + 5']);
  assert.equal(results[0].value, 15);
});

test('evaluateLine resolves chained variables through the scope', () => {
  const scope = { pizzas: 2, pizzaPrice: 30, people: 4 };
  const { result } = evaluateLine('(pizzas * pizzaPrice) / people', scope);
  assert.equal(result, 15);
});

test('evaluateLines stores derived variables as numbers', () => {
  const { results } = evaluateLines([
    'pizzas = 2',
    'pizzaPrice = 30',
    'people = 4',
    'costEach = (pizzas * pizzaPrice) / people',
    'costEach * 2',
  ]);
  assert.equal(results[3].value, 15);
  assert.equal(results[4].value, 30);
});

test('evaluateLines stores falsy assigned values', () => {
  const { results } = evaluateLines(['zero = 0', 'flag = 2 > 1', 'zero + 5']);
  assert.equal(results[0].type, 'assignment');
  assert.equal(results[0].value, 0);
  assert.equal(results[2].value, 5);
});

test('evaluateLines tags evaluation errors', () => {
  const { results } = evaluateLines(['2 +']);
  assert.equal(results[0].type, 'error');
  assert.equal(typeof results[0].value, 'string');
});

test('evaluateLines supports function variables', () => {
  const { results } = evaluateLines(['myCustomFunction = f(x) = x * 2', 'myCustomFunction(4)']);
  assert.equal(results[0].type, 'assignment');
  assert.equal(results[0].value, undefined);
  assert.equal(results[1].value, 8);
});

test('evaluateLines keeps Infinity and null as results', () => {
  const { results } = evaluateLines(['1 / 0', 'null']);
  assert.equal(results[0].value, Infinity);
  assert.equal(results[1].value, null);
});

test('evaluateLines total excludes non-finite values', () => {
  assert.equal(evaluateLines(['1 / 0', '10']).total, 10);
  assert.equal(evaluateLines(['1 / 0', '10', 'sum']).results[2].value, 10);
});

test('evaluateLines computes a total that excludes assignments', () => {
  assert.equal(
    evaluateLines(['pizzas = 2', 'pizzaPrice = 30', 'people = 4', '(pizzas * pizzaPrice) / people'])
      .total,
    15
  );
  assert.equal(evaluateLines(['x = 5', 'y = 6', 'x + y']).total, 11);
  assert.equal(evaluateLines(['x = 0', 'x + 5']).total, 5);
});

test('evaluateLines returns no total without value results', () => {
  assert.equal(evaluateLines(['', '']).total, null);
  assert.equal(evaluateLines(['# only a comment']).total, null);
});

test('evaluateLines resolves prev from the previous line', () => {
  const { results } = evaluateLines(['5', 'prev * 2', 'prev + 1']);
  assert.equal(results[1].value, 10);
  assert.equal(results[2].value, 11);
});

test('evaluateLines chains prev through assignments and errors', () => {
  const { results } = evaluateLines(['10', '2 +', 'prev / 2']);
  assert.equal(results[1].type, 'error');
  assert.equal(results[2].value, 5);
  const { results: ok } = evaluateLines(['x = 20', 'prev / 4']);
  assert.equal(ok[1].value, 5);
});

test('evaluateLines computes sum and total from the lines above', () => {
  const { results, total } = evaluateLines(['10', '20', 'sum']);
  assert.equal(results[2].value, 30);
  assert.equal(total, 30);
  assert.equal(evaluateLines(['10', '20', 'total']).results[2].value, 30);
});

test('evaluateLines computes average and avg from the lines above', () => {
  assert.equal(evaluateLines(['10', '20', 'average']).results[2].value, 15);
  assert.equal(evaluateLines(['10', '20', 'avg']).results[2].value, 15);
});

test('evaluateLines sum stops at an empty line', () => {
  assert.equal(evaluateLines(['10', '', '20', 'sum']).results[3].value, 20);
});

test('evaluateLines aggregate excludes assignments and other aggregates', () => {
  assert.equal(evaluateLines(['x = 5', '10', 'sum']).results[2].value, 10);
  assert.equal(evaluateLines(['1', 'sum', '1']).results[1].value, 1);
  assert.equal(evaluateLines(['1', 'sum', '1']).total, 2);
});

test('evaluateLines aggregate of nothing is 0', () => {
  assert.equal(evaluateLines(['', 'sum']).results[1].value, 0);
  assert.equal(evaluateLines(['', 'average']).results[1].value, 0);
});

test('evaluateLines resolves aggregates inside expressions', () => {
  const { results } = evaluateLines(['10 + 10 + 20', 'a = sum', 'a']);
  assert.equal(results[2].value, 40);
  const avg = evaluateLines(['10', '20', '30', 'm = average']);
  assert.equal(avg.results[3].value, 20);
  assert.equal(evaluateLines(['10', '20', 'sum * 2']).results[2].value, 60);
  assert.equal(evaluateLines(['5', '10', 'sum + prev']).results[2].value, 25);
});

test('evaluateLines keeps the mathjs sum function callable', () => {
  assert.equal(evaluateLines(['sum([1, 2, 3])']).results[0].value, 6);
});

test('evaluateLines rejects assigning to aggregate keywords', () => {
  const { results } = evaluateLines(['sum = 5', 'average = 3', 'total']);
  assert.equal(results[0].type, 'error');
  assert.match(results[0].value, /reserved/);
  assert.equal(results[1].type, 'error');
  assert.equal(results[2].value, 0);
});

test('evaluateLines supports Numi function aliases', () => {
  const { results } = evaluateLines([
    'ln(e)',
    'fact(5)',
    'arcsin(0.5)',
    'arccos(1)',
    'arctan(1)',
    'root(8, 3)',
    'cbrt(27)',
  ]);
  assert.ok(Math.abs(results[0].value - 1) < 1e-9);
  assert.equal(results[1].value, 120);
  assert.ok(Math.abs(results[2].value - Math.PI / 6) < 1e-9);
  assert.ok(Math.abs(results[3].value) < 1e-9);
  assert.ok(Math.abs(results[4].value - Math.PI / 4) < 1e-9);
  assert.ok(Math.abs(results[5].value - 2) < 1e-9);
  assert.equal(results[6].value, 3);
});

test('evaluateLines skips unchanged input', () => {
  const lines = ['a = 1', 'a + 1'];
  evaluateLines(lines);
  const cached = evaluateLines(lines);
  assert.equal(cached.startLine, -1);
  assert.deepEqual(
    cached.results.map((r) => r.value),
    [1, 2]
  );
});

test('evaluateLines recomputes from the first changed line', () => {
  evaluateLines(['a = 1', 'b = 2', 'a + b']);
  const changed = evaluateLines(['a = 1', 'b = 10', 'a + b']);
  assert.equal(changed.startLine, 1);
  assert.deepEqual(
    changed.results.map((r) => r.value),
    [1, 10, 11]
  );
});

test('evaluateLines handles lines added and removed incrementally', () => {
  evaluateLines(['1', '2']);
  assert.deepEqual(
    evaluateLines(['1', '2', '3']).results.map((r) => r.value),
    [1, 2, 3]
  );
  assert.deepEqual(
    evaluateLines(['1']).results.map((r) => r.value),
    [1]
  );
});

test('evaluateLines keeps aggregates correct across incremental edits', () => {
  evaluateLines(['1', '2']);
  const { results } = evaluateLines(['1', '', '2', 'sum']);
  assert.equal(results[3].value, 2);
  const { results: after } = evaluateLines(['5', '', '2', 'sum']);
  assert.equal(after[3].value, 2);
});

test('evaluateLines keeps function variables when resuming from a change', () => {
  evaluateLines(['double = f(x) = x * 2', 'double(3)']);
  const { results } = evaluateLines(['double = f(x) = x * 2', 'double(5)']);
  assert.equal(results[0].type, 'assignment');
  assert.equal(results[1].value, 10);
});

// --- Function sampling for the plot modal ---------------------------------
//
// This must run in the worker: `evaluateLine` drops function results and
// structured clone cannot carry a function, so the main thread can never
// sample a user function itself.

test('evaluateLines tags a function definition with its name and arity', () => {
  const { results } = evaluateLines(['double = f(x) = x * 2', 'area = f(w, h) = w * h', '5']);
  assert.deepEqual(results[0].fn, { name: 'double', arity: 1 });
  assert.deepEqual(results[1].fn, { name: 'area', arity: 2 });
  assert.equal(results[2].fn, undefined, 'a plain value is not tagged');
});

test('sampleFunction samples a single-argument function evenly', () => {
  const { points, skipped, reason } = sampleFunction(['double = f(x) = x * 2'], 'double', -2, 2, 5);
  assert.equal(reason, null);
  assert.equal(skipped, 0);
  assert.deepEqual(points, [
    [-2, -4],
    [-1, -2],
    [0, 0],
    [1, 2],
    [2, 4],
  ]);
});

test('sampleFunction skips a singularity instead of emitting Infinity', () => {
  const { points, skipped, reason } = sampleFunction(['inv = f(x) = 1 / x'], 'inv', -1, 1, 3);
  assert.equal(reason, null);
  assert.equal(skipped, 1, 'the point at x = 0 was dropped');
  assert.deepEqual(points, [
    [-1, -1],
    [1, 1],
  ]);
  assert.ok(points.every(([, y]) => Number.isFinite(y)));
});

test('sampleFunction never lets a throwing function escape', () => {
  const { points, skipped } = sampleFunction(
    ['boom = f(x) = sqrt(x) + unknownSymbol'],
    'boom',
    1,
    4,
    4
  );
  assert.equal(points.length, 0);
  assert.equal(skipped, 4, 'every sample was caught individually');
});

test('sampleFunction rejects a multi-argument function with a reason', () => {
  const { points, reason } = sampleFunction(['area = f(w, h) = w * h'], 'area', 0, 10, 8);
  assert.deepEqual(points, []);
  assert.match(reason, /only single-argument functions/);
});

test('sampleFunction reports an unknown name rather than throwing', () => {
  const { points, reason } = sampleFunction(['a = 1'], 'nope', 0, 10, 8);
  assert.deepEqual(points, []);
  assert.match(reason, /not a function in this sheet/);
});

test('sampleFunction refuses a function that returns a unit', () => {
  const { points, reason } = sampleFunction(['toCm = f(x) = x * 1 cm'], 'toCm', 0, 2, 4);
  assert.deepEqual(points, []);
  assert.match(reason, /doesn't return a plain number/);
});

test('sampleFunction rejects a degenerate domain', () => {
  for (const [from, to] of [
    [1, 1],
    [NaN, 5],
    [0, Infinity],
  ]) {
    const { reason } = sampleFunction(['d = f(x) = x'], 'd', from, to, 8);
    assert.match(reason, /two different finite numbers/, `domain ${from}..${to}`);
  }
});

test('sampleFunction caps the sample count regardless of what is asked for', () => {
  assert.equal(sampleFunction(['d = f(x) = x'], 'd', 0, 1, 1e6).points.length, MAX_SAMPLES);
  assert.equal(sampleFunction(['d = f(x) = x'], 'd', 0, 1, -5).points.length, 2, 'floor of 2');
  assert.equal(sampleFunction(['d = f(x) = x'], 'd', 0, 1, undefined).points.length, 64);
});

test('sampleFunction sees functions defined further down the sheet', () => {
  const { points } = sampleFunction(
    ['a = 3', 'b = a * 2', 'scale = f(x) = x * b'],
    'scale',
    1,
    3,
    3
  );
  assert.deepEqual(points, [
    [1, 6],
    [2, 12],
    [3, 18],
  ]);
});
