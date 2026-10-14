import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';

// REVIEW.md SHEET-04: `f(x) = x * 2` is the canonical way to define a function
// (the docs say so), but the engine evaluated it in a scope that was thrown away
// and stored it under the label "f(x)", so `f(4)` failed or ran a built-in.
const run = (lines) => createEngine().evaluateLines(lines).results;
const shown = (lines, index) => formatResult(run(lines)[index].value);

test('SHEET-04: a plain definition defines the function', () => {
  assert.equal(shown(['f(x) = x * 2', 'f(4)'], 1), '8');
  assert.equal(shown(['g(a, b) = a + b', 'g(2, 3)'], 1), '5');
  assert.equal(shown(['f (x) = x * 2', 'f(4)'], 1), '8', 'a space before the bracket');
});

test('SHEET-04: a definition shadows a built-in of the same name', () => {
  assert.equal(shown(['fact(n) = n + 1', 'fact(5)'], 1), '6');
  assert.equal(shown(['sqrt(x) = x + 1', 'sqrt(16)'], 1), '17');
  assert.equal(shown(['abs(x) = 0', 'abs(-3)'], 1), '0');
});

test('SHEET-04: the definition row is not an error and shows no value', () => {
  const [row] = run(['f(x) = x * 2', 'f(4)']);
  assert.equal(row.type, 'assignment');
  assert.equal(row.value, undefined);
});

test('SHEET-04: a function can call another and use variables defined before the call', () => {
  const lines = ['rate = 3', 'pay(h) = h * rate', 'twice(h) = pay(h) * 2', 'twice(5)'];
  assert.equal(shown(lines, 3), '30');
});

test('SHEET-04: the alias form still works', () => {
  assert.equal(shown(['double = f(x) = x * 2', 'double(4)'], 1), '8');
});

test('SHEET-04: redefining a function changes later calls and removing it removes them', () => {
  const engine = createEngine();
  const call = (lines) => {
    const { results } = engine.evaluateLines(lines);
    return results[results.length - 1];
  };
  assert.equal(formatResult(call(['f(x) = x * 2', 'f(4)']).value), '8');
  assert.equal(formatResult(call(['f(x) = x * 3', 'f(4)']).value), '12');
  const gone = call(['f(4)']);
  assert.equal(gone.type, 'error');
});

test('SHEET-04: a definition that fails to evaluate defines nothing', () => {
  const results = run(['f(x) = x * ', 'f(4)']);
  assert.equal(results[0].type, 'error');
  assert.equal(results[1].type, 'error');
});

// REVIEW.md SHEET-05: the docs said a function "applies to every element" of a
// list and that arithmetic is "element-wise", but the engine follows mathjs: a
// function receives the whole list and `*`, `/`, `^` are matrix operations. Making
// functions map automatically would break one that legitimately takes a list
// (`average(xs) = sum(xs) / size(xs)[1]`), so the docs describe what happens and
// these tests pin it, along with the ways to work element by element.
test('SHEET-05: a function receives the whole list it is called with', () => {
  assert.equal(shown(['sq = f(x) = x * x', 'sq(1:3)'], 1), '14', 'x * x is a dot product');
  assert.equal(shown(['avg(xs) = sum(xs) / size(xs)[1]', 'avg([2, 4, 6])'], 1), '4');
  assert.equal(shown(['double = f(x) = x * 2', 'double(1:5)'], 1), '[2, 4, 6, 8, 10]');
});

test('SHEET-05: map and the dot operators work element by element', () => {
  assert.equal(shown(['sq = f(x) = x * x', 'map(1:3, sq)'], 1), '[1, 4, 9]');
  assert.equal(shown(['[1, 2] .* [3, 4]'], 0), '[3, 8]');
  assert.equal(shown(['[1, 2, 3] .^ 2'], 0), '[1, 4, 9]');
  assert.equal(shown(['[4, 6] ./ [2, 3]'], 0), '[2, 2]');
  assert.equal(shown(['[1, 2] + [3, 4]'], 0), '[4, 6]');
});
