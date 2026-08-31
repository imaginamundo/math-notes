import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLines, evaluateLine } from '../js/core/calculate.js';
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
