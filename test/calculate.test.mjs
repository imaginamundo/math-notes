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
  // `2 +` and `nope(` would now be continuations onto the next line, so use
  // an error that does not dangle.
  const { results } = evaluateLines(['10', 'notAVariable', 'prev / 2']);
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

// --- Grouping: block comments and continuations -----------------------------
//
// evaluateLines keeps a module-level cache, so these cases matter more than
// the single-shot ones: an edit inside a group must widen the recompute window
// back to the group's first line, or a stale result survives.

test('evaluateLines evaluates a continuation run once, on its last line', () => {
  const { results, kinds } = evaluateLines(['x = 1 +', '2', 'x * 10']);
  assert.deepEqual(kinds, ['continuation', 'code', 'code']);
  assert.equal(results[0].value, undefined, 'no result on a continued line');
  assert.equal(results[1].value, 3);
  assert.equal(results[2].value, 30, 'the joined assignment reached the scope');
});

test('evaluateLines gives a fenced block no results and no total', () => {
  const { results, total, kinds } = evaluateLines(['10', '###', '999', 'notes', '###', '20']);
  assert.deepEqual(kinds, ['code', 'fence', 'comment', 'comment', 'fence', 'code']);
  for (const index of [1, 2, 3, 4]) {
    assert.equal(results[index].value, undefined, `line ${index} produced a result`);
  }
  assert.equal(total, 30, 'the 999 inside the block stayed out of the total');
});

test('evaluateLines keeps an aggregate block alive across a fenced comment', () => {
  const { results } = evaluateLines(['10', '###', '', 'a blank line in here', '###', '20', 'sum']);
  // A blank line inside the block must not reset the aggregate block.
  assert.equal(results[6].value, 30);
});

test('evaluateLines still resets an aggregate block on a real blank line', () => {
  const { results } = evaluateLines(['10', '', '20', 'sum']);
  assert.equal(results[3].value, 20);
});

test('evaluateLines lets prev skip over comment and continuation lines', () => {
  const { results } = evaluateLines(['10', '###', '999', '###', 'prev * 2']);
  assert.equal(results[4].value, 20);
});

test('evaluateLines recomputes the whole group when a continued line is edited', () => {
  evaluateLines(['x = 1 +', '2', 'x * 10']);
  const { results, startLine } = evaluateLines(['x = 5 +', '2', 'x * 10']);
  assert.equal(startLine, 0);
  assert.equal(results[1].value, 7);
  assert.equal(results[2].value, 70, 'the stale x = 3 did not survive');
});

test('evaluateLines widens the recompute window back to the group start', () => {
  evaluateLines(['a = 1', 'sum(1,', '2,', '3)']);
  // Editing the LAST line of the run must recompute from the run's first line.
  const { startLine, results } = evaluateLines(['a = 1', 'sum(1,', '2,', '30)']);
  assert.equal(startLine, 1, 'expected the window to widen to the group start');
  assert.equal(results[3].value, 33);
});

test('evaluateLines re-kinds everything below a newly opened fence', () => {
  evaluateLines(['10', '20', '30']);
  const { results, total, kinds } = evaluateLines(['10', '###', '30']);
  assert.deepEqual(kinds, ['code', 'fence', 'comment']);
  assert.equal(results[2].value, undefined, 'line 3 is comment text now');
  assert.equal(total, 10);
});

test('evaluateLines re-kinds everything below a closed fence', () => {
  evaluateLines(['10', '###', '30', '40']);
  const { results, total } = evaluateLines(['10', '###', '###', '40']);
  assert.equal(results[3].value, 40, 'line 4 evaluates again once the block closed');
  assert.equal(total, 50);
});

test('evaluateLines restores results when a fence is deleted', () => {
  evaluateLines(['10', '###', '30', '40']);
  const { results, total } = evaluateLines(['10', '20', '30', '40']);
  assert.equal(results[2].value, 30);
  assert.equal(results[3].value, 40);
  assert.equal(total, 100);
});

test('evaluateLines stays correct across interleaved sheets', () => {
  // The cache is module-level, so two sheets sharing it must not bleed.
  const sheetA = ['a = 2 +', '3', 'a * 10'];
  const sheetB = ['###', 'a = 999', '###', '7'];
  assert.equal(evaluateLines(sheetA).results[2].value, 50);
  assert.equal(evaluateLines(sheetB).results[3].value, 7);
  assert.equal(evaluateLines(sheetA).results[2].value, 50);
  assert.equal(evaluateLines(sheetB).total, 7);
});

test('evaluateLines returns a kind for every line, on every path', () => {
  const lines = ['1', '###', 'x', '###', '2 +', '3', ''];
  const first = evaluateLines(lines);
  assert.equal(first.kinds.length, lines.length);
  // The unchanged-input fast path must still report kinds, or the renderer
  // would lose them on a no-op update.
  const again = evaluateLines(lines.slice());
  assert.equal(again.startLine, -1);
  assert.deepEqual(again.kinds, first.kinds);
});
