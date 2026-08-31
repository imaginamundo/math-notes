import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLines, evaluateLine } from '../js/calculate.js';
import parseLine from '../js/parseLine.js';

test('parseLine splits a plain expression', () => {
  const parsed = parseLine('1 + 1');
  assert.deepEqual(parsed, {
    code: '1 + 1',
    comment: '',
    label: '',
    rhs: '',
    isAssignment: false,
    equalsIndex: -1
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
    'costEach * 2'
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
  const { results } = evaluateLines([
    'myCustomFunction = f(x) = x * 2',
    'myCustomFunction(4)'
  ]);
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
    evaluateLines(['pizzas = 2', 'pizzaPrice = 30', 'people = 4', '(pizzas * pizzaPrice) / people']).total,
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
