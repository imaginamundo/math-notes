import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLines, evaluateLine, registerCurrencyRates } from '../js/core/calculate.js';
import parseLine from '../js/core/parseLine.js';

test('parseLine splits a plain expression', () => {
  const parsed = parseLine('1 + 1');
  assert.deepEqual(parsed, {
    code: '1 + 1',
    comment: '',
    tags: [],
    valid: true,
    label: '',
    rhs: '',
    isAssignment: false,
    equalsIndex: -1,
    title: '',
    rawCode: '1 + 1',
    tail: '',
    titleIndex: -1,
  });
});

test('parseLine separates tags from comments', () => {
  const tagged = parseLine('20 #food #urgent');
  assert.equal(tagged.code, '20 ');
  assert.deepEqual(tagged.tags, ['food', 'urgent']);
  assert.equal(tagged.comment, '');

  const commented = parseLine('20 # a note');
  assert.deepEqual(commented.tags, []);
  assert.equal(commented.comment, '# a note');

  const both = parseLine('20 #food # a note');
  assert.deepEqual(both.tags, ['food']);
  assert.equal(both.comment, '# a note');
});

test('parseLine flags a tag placed mid-expression', () => {
  assert.equal(parseLine('20 #food + 10').valid, false);
  assert.equal(parseLine('20 #food').valid, true);
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

test('parseLine does not read comparisons as assignments', () => {
  for (const line of ['1 == 1', '2 >= 1', '2 <= 3', '1 != 2']) {
    assert.equal(parseLine(line).isAssignment, false, line);
  }
  assert.equal(parseLine('a >= b').label, '');
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

test('evaluateLines supports multi-word variable names', () => {
  const { results, total } = evaluateLines(['monthly rent = 1500', 'monthly rent * 12']);
  assert.equal(results[0].type, 'assignment');
  assert.equal(results[0].value, 1500);
  assert.equal(results[1].value, 18000);
  assert.equal(total, 18000);
});

test('multi-word names are not confused with word operators or aggregates', () => {
  assert.equal(evaluateLines(['total cost = 50', 'total cost + 10']).results[1].value, 60);
  assert.equal(evaluateLines(['net price = 100', 'net price plus 5']).results[1].value, 105);
  assert.equal(evaluateLines(['sum total = 5', 'sum total * 2']).results[1].value, 10);
});

test('undefined multi-word names give a phrase-level error', () => {
  assert.equal(
    evaluateLines(['monthly rent * 12']).results[0].value,
    '"monthly rent" is not defined'
  );
  assert.equal(evaluateLines(['net price plus 5']).results[0].value, '"net price" is not defined');
  // A forward reference is mangled, then decoded back for the message.
  assert.equal(
    evaluateLines(['monthly rent * 12', 'monthly rent = 1500']).results[0].value,
    '"monthly rent" is not defined'
  );
});

test('single unknown symbols keep the mathjs message', () => {
  assert.equal(evaluateLines(['foo + 1']).results[0].value, 'Undefined symbol foo');
  assert.equal(evaluateLines(['sin x']).results[0].value, 'Undefined symbol x');
});

test('multi-word variables update incrementally and vanish with their definition', () => {
  evaluateLines(['price per item = 10', 'price per item * 3']);
  const updated = evaluateLines(['price per item = 20', 'price per item * 3']);
  assert.equal(updated.results[1].value, 60);
  const removed = evaluateLines(['price per item * 3']);
  assert.equal(removed.results[0].type, 'error');
});

test('single words, units and scales are unaffected', () => {
  assert.equal(evaluateLines(['2 kg']).results[0].type, 'value');
  assert.equal(evaluateLines(['2k']).results[0].value, 2000);
  assert.equal(evaluateLines(['rate = 5', 'rate * 2']).results[1].value, 10);
});

test('tags sum all tagged value rows above', () => {
  const { results, total } = evaluateLines(['20 #food', '30 #food', '#food']);
  assert.equal(results[2].aggregate, true);
  assert.equal(results[2].value, 50);
  assert.equal(total, 50, 'the request row is not double counted');
});

test('tag requests support explicit sum and average', () => {
  assert.equal(evaluateLines(['20 #food', '30 #food', 'total #food']).results[2].value, 50);
  assert.equal(evaluateLines(['20 #food', '30 #food', 'average of #food']).results[2].value, 25);
});

test('a row shared between several tags is split between them', () => {
  // `20 #food #urgent` gives 10 to each tag; `30 #food` keeps its whole value.
  assert.equal(evaluateLines(['20 #food #urgent', '30 #food', '#urgent']).results[2].value, 10);
  assert.equal(
    evaluateLines(['20 #food #urgent', '30 #food', '#food #urgent']).results[2].value,
    40
  );
});

test('a split row keeps its full value in the group total', () => {
  const { results } = evaluateLines([
    'At the bar:',
    'potato: 20 #name1 #name2 #name3',
    'burger: 2 * 50 #name1 #name3',
    'beer: 160 #name1 #name2 #name3 #name4',
    'end',
    '',
    '#name1',
  ]);
  assert.equal(results[0].value, 280, 'the header is the full bill');
  assert.ok(Math.abs(results[6].value - 96.66666666666667) < 1e-9, "one person's share");
});

test('tag sums follow the unit rules and ignore assignments and aggregates', () => {
  const unit = evaluateLines(['10 cm #t', '1 m #t', '#t']).results[2].value;
  assert.equal(unit.formatUnits(), 'm');
  assert.ok(Math.abs(unit.toNumber() - 1.1) < 1e-9);
  assert.equal(evaluateLines(['x = 5 #t', '10 #t', 'sum', '#t']).results[3].value, 10);
});

test('tags can take part in calculations', () => {
  assert.equal(evaluateLines(['20 #food', '#food * 2']).results[1].value, 40);
  assert.equal(evaluateLines(['20 #food', '30 #other', '#food + #other']).results[2].value, 50);
  assert.equal(evaluateLines(['20 #food', '30 #food', '#food * 2 + 5']).results[2].value, 105);
  assert.equal(evaluateLines(['20 #food', '#food / 2']).results[1].value, 10);

  const unit = evaluateLines(['10 cm #t', '1 m #t', '#t * 2']).results[2].value;
  assert.equal(unit.formatUnits(), 'm');
  assert.ok(Math.abs(unit.toNumber() - 2.2) < 1e-9);
});

test('a calculation tag with no tagged lines is an error', () => {
  assert.equal(
    evaluateLines(['20 #food', '#missing * 2']).results[1].value,
    'No values tagged #missing'
  );
});

test('requesting a tag with no tagged lines is an error', () => {
  assert.equal(evaluateLines(['#food']).results[0].type, 'error');
  assert.equal(evaluateLines(['#food']).results[0].value, 'No values tagged #food');
  assert.equal(
    evaluateLines(['20 #food', 'average #food']).results[1].value,
    20,
    'a tagged line still works'
  );
  assert.equal(
    evaluateLines(['20 #food', '#urgent #other']).results[1].value,
    'No values tagged #urgent, #other'
  );
});

test('line references resolve the value of a line above', () => {
  assert.equal(evaluateLines(['5', 'line(1) * 2']).results[1].value, 10);
  assert.equal(evaluateLines(['5', 'line(1) + line(1)']).results[1].value, 10);
  assert.equal(evaluateLines(['5', 'x = line(1) + 1', 'x']).results[2].value, 6);
});

test('line references keep units', () => {
  const total = evaluateLines(['10 cm', 'line(1) + 5 cm']).results[1].value;
  assert.equal(total.formatUnits(), 'cm');
  assert.ok(Math.abs(total.toNumber() - 15) < 1e-9);
});

test('line references only look at value rows above', () => {
  assert.equal(evaluateLines(['line(2)', '5']).results[0].value, 'Line 2 is below this line');
  assert.equal(evaluateLines(['line(1)']).results[0].value, 'Line 1 is below this line');
  assert.equal(evaluateLines(['line(0)']).results[0].value, 'Line 0 does not exist');
  assert.equal(evaluateLines(['x = 5', 'line(1)']).results[1].value, 'Line 1 has no value');
});

test('line references update when the referenced line changes', () => {
  evaluateLines(['5', 'line(1)']);
  assert.equal(evaluateLines(['7', 'line(1)']).results[1].value, 7);
});

test('evaluateLines evaluates comparisons as values', () => {
  assert.equal(evaluateLines(['2 >= 1']).results[0].value, true);
  assert.equal(evaluateLines(['1 == 1']).results[0].value, true);
  assert.equal(evaluateLines(['1 != 2']).results[0].value, true);
  assert.equal(evaluateLines(['x = 3', 'x <= 2']).results[1].value, false);
});

test('evaluateLines recomputes conversions when rates change', () => {
  const setRates = (usd) => registerCurrencyRates({ base: 'EUR', rates: { USD: usd } });
  setRates(1.1);
  const before = evaluateLines(['1 USD to EUR']);
  assert.equal(before.startLine, 0);
  assert.ok(Math.abs(before.results[0].value.toNumber('EUR') - 1 / 1.1) < 1e-9);
  assert.equal(evaluateLines(['1 USD to EUR']).startLine, -1, 'cached while rates are stable');

  setRates(2.2);
  const after = evaluateLines(['1 USD to EUR']);
  assert.equal(after.startLine, 0, 'a rate change must not be served from cache');
  assert.ok(Math.abs(after.results[0].value.toNumber('EUR') - 1 / 2.2) < 1e-9);
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

test('evaluateLines totals values that share one unit', () => {
  const total = evaluateLines(['10 cm', '5 cm']).total;
  assert.equal(total.isUnit, true);
  assert.ok(Math.abs(total.toNumber() - 15) < 1e-9);
  assert.equal(total.formatUnits(), 'cm');
});

test('evaluateLines ignores mixed units but still sums plain numbers', () => {
  assert.equal(evaluateLines(['10 cm', '5 kg']).total, null);
  assert.equal(evaluateLines(['10 cm', '5 kg', '10', '10']).total, 20);
});

test('evaluateLines folds plain numbers into a single shared unit', () => {
  const total = evaluateLines(['10 cm', '10']).total;
  assert.equal(total.isUnit, true);
  assert.ok(Math.abs(total.toNumber() - 20) < 1e-9);
  assert.equal(total.formatUnits(), 'cm');
});

test('evaluateLines merges compatible units into the largest present', () => {
  const length = evaluateLines(['10 cm', '1 m']).total;
  assert.equal(length.formatUnits(), 'm');
  assert.ok(Math.abs(length.toNumber() - 1.1) < 1e-9);

  const time = evaluateLines(['2 h', '30 minutes']).total;
  assert.equal(time.formatUnits(), 'h');
  assert.ok(Math.abs(time.toNumber() - 2.5) < 1e-9);

  const mass = evaluateLines(['500 g', '2 kg', '10']).total;
  assert.equal(mass.formatUnits(), 'kg');
  assert.ok(Math.abs(mass.toNumber() - 12.5) < 1e-9);
});

test('evaluateLines aggregates compatible units too', () => {
  const sum = evaluateLines(['10 cm', '1 m', 'sum']).results[2].value;
  assert.equal(sum.formatUnits(), 'm');
  assert.ok(Math.abs(sum.toNumber() - 1.1) < 1e-9);
});

test('a group shows its subtotal on the header without double counting', () => {
  const { results, total } = evaluateLines(['Groceries:', '10', '20', 'end']);
  assert.equal(results[0].type, 'value');
  assert.equal(results[0].aggregate, true);
  assert.equal(results[0].value, 30);
  assert.equal(results[0].group, 'header');
  assert.equal(results[1].group, 'body');
  assert.equal(results[3].value, undefined);
  assert.equal(results[3].group, 'end');
  assert.equal(total, 30);
});

test('a group ignores blank lines and scopes sum to itself', () => {
  const { results } = evaluateLines(['Groceries:', '10', '', '20', 'sum', 'end']);
  assert.equal(results[0].value, 30);
  assert.equal(results[4].value, 30);
  assert.equal(results[5].value, undefined);
});

test('an unterminated header is just a label', () => {
  const { results, total } = evaluateLines(['Groceries:', '10']);
  assert.equal(results[0].value, undefined);
  assert.equal(results[0].group, undefined);
  assert.equal(total, 10);
});

test('end without an open group shows a helpful error', () => {
  assert.equal(
    evaluateLines(['10', 'end']).results[1].value,
    '"end" without a matching group header'
  );
  assert.equal(
    evaluateLines(['10', 'end #food']).results[1].value,
    '"end" without a matching group header'
  );
});

test('a group subtotal follows the unit rules', () => {
  const subtotal = evaluateLines(['Trip:', '10 cm', '1 m', 'end']).results[0].value;
  assert.equal(subtotal.formatUnits(), 'm');
  assert.ok(Math.abs(subtotal.toNumber() - 1.1) < 1e-9);
});

test('prev after end is the group subtotal', () => {
  assert.equal(evaluateLines(['G:', '10', '20', 'end', 'prev * 2']).results[4].value, 60);
});

test('editing or removing a group refreshes the header subtotal', () => {
  evaluateLines(['G:', '10', '20', 'end']);
  const edited = evaluateLines(['G:', '10', '30', 'end']).results[0];
  assert.equal(edited.value, 40);

  const removed = evaluateLines(['G:', '10', '30']).results[0];
  assert.equal(removed.value, undefined);
  assert.equal(removed.group, undefined);
});

test('evaluateLines ignores mixed currencies but folds plain numbers', () => {
  registerCurrencyRates({ base: 'EUR', rates: { BRL: 5.5, USD: 1.1 } });
  assert.equal(evaluateLines(['500 BRL', '10 USD']).total, null);
  assert.equal(evaluateLines(['500 BRL', '10 USD', '10', '10']).total, 20);

  const single = evaluateLines(['500 BRL', '10']).total;
  assert.equal(single.formatUnits(), 'BRL');
  assert.ok(Math.abs(single.toNumber() - 510) < 1e-9);
});

test('evaluateLines keeps same affine units apart from other temperatures', () => {
  const celsius = evaluateLines(['20 degC', '5 degC']).total;
  assert.equal(celsius.formatUnits(), 'degC');
  assert.ok(Math.abs(celsius.toNumber() - 25) < 1e-9);
  assert.equal(evaluateLines(['20 degC', '5 degF']).total, null);
});

test('evaluateLines totals values that share a currency', () => {
  registerCurrencyRates({ base: 'EUR', rates: { BRL: 5.5 } });
  const { total } = evaluateLines(['daily = 24.8 BRL', 'fixed = 750 BRL', '22 * daily + fixed']);
  assert.equal(total.isUnit, true);
  assert.equal(total.formatUnits(), 'BRL');
  assert.ok(Math.abs(total.toNumber() - (22 * 24.8 + 750)) < 1e-9);
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

test('evaluateLines treats uppercase aggregates like lowercase', () => {
  assert.equal(evaluateLines(['10', '20', 'SUM']).results[2].value, 30);
  assert.equal(evaluateLines(['10', '20', 'SUM + 1']).results[2].value, 31);
});

test('evaluateLines bounds huge ranges but allows empty ones', () => {
  const huge = evaluateLines(['1:100000000']);
  assert.equal(huge.results[0].type, 'error');
  assert.match(huge.results[0].value, /limited/);
  const empty = evaluateLines(['100:1', '5:5']);
  assert.equal(empty.results[0].type, 'value');
  assert.equal(empty.results[1].type, 'value');
});

test('evaluateLines sum stops at an empty line', () => {
  assert.equal(evaluateLines(['10', '', '20', 'sum']).results[3].value, 20);
});

test('evaluateLines aggregate excludes assignments and other aggregates', () => {
  assert.equal(evaluateLines(['x = 5', '10', 'sum']).results[2].value, 10);
  assert.equal(evaluateLines(['1', 'sum', '1']).results[1].value, 1);
});

test('evaluateLines aggregates values that share one unit', () => {
  const sum = evaluateLines(['10 cm', '5 cm', 'sum']).results[2].value;
  assert.equal(sum.isUnit, true);
  assert.ok(Math.abs(sum.toNumber() - 15) < 1e-9);
  assert.equal(sum.formatUnits(), 'cm');

  const folded = evaluateLines(['10 cm', '10', 'sum']).results[2].value;
  assert.equal(folded.isUnit, true);
  assert.ok(Math.abs(folded.toNumber() - 20) < 1e-9);

  const avg = evaluateLines(['10 cm', '20 cm', 'average']).results[2].value;
  assert.equal(avg.isUnit, true);
  assert.ok(Math.abs(avg.toNumber() - 15) < 1e-9);

  assert.equal(evaluateLines(['10 cm', '5 kg', 'sum']).results[2].value, 0);
  assert.equal(evaluateLines(['10 cm', '5 kg', '10', 'sum']).results[2].value, 10);
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

test('evaluateLines rejects assigning to prev, date keywords and internals', () => {
  const { results } = evaluateLines([
    'prev = 5',
    'today = 5',
    '__rate = 5',
    '__var_a_b = 5',
    '3',
    'prev',
  ]);
  for (const index of [0, 1, 2, 3]) {
    assert.equal(results[index].type, 'error', `line ${index} is rejected`);
    assert.match(results[index].value, /reserved/);
  }
  assert.equal(results[5].value, 3, 'prev still resolves after the errors');
});

test('a multi-word name containing a keyword is still a variable', () => {
  const { results } = evaluateLines(['sum total = 5', 'prev x = 2', 'sum total * 2', 'prev x * 3']);
  assert.equal(results[0].type, 'assignment');
  assert.equal(results[2].value, 10);
  assert.equal(results[3].value, 6);
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
