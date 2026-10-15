import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';

function engine() {
  return createEngine();
}

function kg(value) {
  return value && value.isUnit ? value.to('kg').toNumber() : value;
}

test('a unit definition registers the name and its plural', () => {
  const { results } = engine().evaluateLines(['unit widget = 3.5 kg', '2 widgets']);
  assert.equal(results[0].type, 'value');
  assert.equal(formatResult(results[0].value), '3.5 kg');
  assert.equal(results[1].value.isUnit, true);
  assert.ok(Math.abs(kg(results[1].value) - 7) < 1e-9);
  assert.equal(formatResult(results[1].value), '2 widgets');
});

test('a unit can be written without a space before the number', () => {
  const { results } = engine().evaluateLines(['unit widget = 3.5 kg', '2widgets']);
  assert.ok(Math.abs(kg(results[1].value) - 7) < 1e-9);
});

test('a multi-word unit works in the singular and plural', () => {
  const { results } = engine().evaluateLines([
    'unit monthly rent = 1500',
    '2 monthly rents',
    '3 monthly rent',
  ]);
  assert.equal(results[1].value, 3000);
  assert.equal(results[2].value, 4500);
});

test('a non-ASCII unit name is encoded and shown readably', () => {
  const { results } = engine().evaluateLines(['unit açai = 2 kg', '3 açais']);
  assert.ok(Math.abs(kg(results[1].value) - 6) < 1e-9);
  assert.equal(formatResult(results[1].value), '3 açais');
});

test('a unit can be defined from another custom unit', () => {
  const { results } = engine().evaluateLines([
    'unit widget = 3.5 kg',
    'unit box = 12 widgets',
    '2 boxes',
  ]);
  assert.ok(Math.abs(kg(results[2].value) - 84) < 1e-9);
});

test('a unit definition is excluded from the total and prev', () => {
  const { results, total } = engine().evaluateLines(['unit widget = 3.5 kg']);
  assert.equal(total, null, 'the definition alone is not a total');
  assert.equal(results[0].aggregate, true);

  const withValue = engine().evaluateLines(['unit widget = 3.5 kg', '5', '1 widget', 'prev']);
  assert.equal(formatResult(withValue.results[3].value), '1 widget');
});

test('a custom unit follows the total unit rules', () => {
  const { total } = engine().evaluateLines(['unit widget = 3.5 kg', '2 widgets', '1 kg']);
  assert.ok(Math.abs(kg(total) - 8) < 1e-9);
});

test('editing a definition re-registers the unit', () => {
  const e = engine();
  e.evaluateLines(['unit widget = 3.5 kg', '2 widgets']);
  const { results } = e.evaluateLines(['unit widget = 4 kg', '2 widgets']);
  assert.ok(Math.abs(kg(results[1].value) - 8) < 1e-9);
});

test('removing a definition removes the unit', () => {
  const e = engine();
  e.evaluateLines(['unit widget = 3.5 kg', '2 widgets']);
  const { results } = e.evaluateLines(['2 widgets']);
  assert.equal(results[0].type, 'error');
  assert.match(results[0].value, /widgets/);
});

test('an unchanged leading definition is rebuilt for a later edit', () => {
  const e = engine();
  e.evaluateLines(['unit widget = 3.5 kg', '2 widgets', '10']);
  const { results } = e.evaluateLines(['unit widget = 3.5 kg', '2 widgets', '20']);
  assert.ok(Math.abs(kg(results[1].value) - 7) < 1e-9, 'the cached use stays a unit');
  assert.equal(results[2].value, 20);
});

test('a name already taken by a unit or a symbol is rejected', () => {
  assert.match(engine().evaluateLines(['unit m = 3 kg']).results[0].value, /already a unit/);
  assert.match(engine().evaluateLines(['unit kg = 2 kg']).results[0].value, /already a unit/);
  assert.match(engine().evaluateLines(['unit max = 3']).results[0].value, /already a unit/);
});

test('a definition must be a number or a unit', () => {
  assert.match(
    engine().evaluateLines(['unit foo = today']).results[0].value,
    /must be a number or a unit/
  );
  assert.match(engine().evaluateLines(['unit foo = 1/0']).results[0].value, /number or a unit/);
});

test('unit and total are reserved words', () => {
  assert.match(engine().evaluateLines(['unit = 5']).results[0].value, /reserved/);
  assert.match(engine().evaluateLines(['total = 5']).results[0].value, /reserved/);
  assert.match(engine().evaluateLines(['unit total = 5']).results[0].value, /reserved/);
  assert.match(engine().evaluateLines(['unit end = 5']).results[0].value, /reserved/);
});

test('multi-word names containing total or unit are still variables', () => {
  const { results } = engine().evaluateLines([
    'total cost = 50',
    'sum total = 5',
    'total cost + sum total',
  ]);
  assert.equal(results[0].type, 'assignment');
  assert.equal(results[2].value, 55);
});

test('a single-word unit definition is not collected as a multi-word variable', () => {
  const { results } = engine().evaluateLines(['unit widget = 3.5 kg', 'widget']);
  assert.equal(results[0].type, 'value');
  assert.equal(results[1].type, 'value');
  assert.equal(results[1].value.isUnit, true, 'widget resolves as the unit');
});

// REVIEW.md AGG-04: mathjs decides when a function body is compiled whether a free
// symbol is a unit, so a function defined above a `unit` line could not use it.
test('AGG-04: a function defined above a unit definition can use the unit', () => {
  const show = (lines, index) => {
    const row = createEngine().evaluateLines(lines).results[index];
    return row.type === 'error' ? `ERR ${row.value}` : formatResult(row.value);
  };
  const above = ['f = g(x) = x * 1 widget', 'unit widget = 2 kg', 'f(3) to kg'];
  assert.equal(show(above, 2), '6 kg');
  assert.equal(show(['f = g(x) = x * 2 widgets', 'unit widget = 2 kg', 'f(3) to kg'], 2), '12 kg');
  assert.equal(show(['f = g(x) = x kg to widget', 'unit widget = 2 kg', 'f(6)'], 2), '3 widget');
  // The same function with the unit above it already worked.
  assert.equal(show(['unit widget = 2 kg', 'f = g(x) = x * 1 widget', 'f(3) to kg'], 2), '6 kg');
});

test('AGG-04: deleting the unit definition makes the unit undefined again', () => {
  const engine = createEngine();
  engine.evaluateLines(['f = g(x) = x * 1 widget', 'unit widget = 2 kg', 'f(3)']);
  const gone = engine.evaluateLines(['f = g(x) = x * 1 widget', 'f(3)']).results[1];
  assert.equal(gone.type, 'error');
  assert.match(String(gone.value), /widget/);
});

// REVIEW.md UNIT-06: a custom unit defined from a currency (`unit coffee = $4.5`)
// was classified by its name, so totals, `sum` and group headers split it from its
// own currency and dropped both, yet merged two such units from different
// currencies through exchange rates.
import { FIXTURE_RATES } from './helpers/rates.mjs';

const money = (lines) => {
  const { results, total } = createEngine({ rates: FIXTURE_RATES }).evaluateLines(lines);
  const shown = (value) => (value === null || value === undefined ? null : formatResult(value));
  return {
    rows: results.map((row) => (row.type === 'error' ? `ERR ${row.value}` : shown(row.value))),
    total: shown(total),
  };
};

test('UNIT-06: a unit defined from a currency totals with that currency', () => {
  const lines = ['unit coffee = $4.5', '3 coffees', '$10'];
  assert.equal(money(lines).total, 'US$ 23.5');
  assert.equal(money([...lines, 'sum']).rows[3], 'US$ 23.5');
  assert.equal(money(['Group:', ...lines.slice(1), 'end'].slice(0, 4)).rows.length, 4);
});

test('UNIT-06: it still totals when a plain number is in the block', () => {
  // The plain 5 folds into the dollar group: 13.5 + 10 + 5.
  assert.equal(money(['unit coffee = $4.5', '3 coffees', '$10', '5']).total, 'US$ 28.5');
});

test('UNIT-06: custom units on two different currencies are a conflict', () => {
  const sheet = ['unit coffee = 4.5 USD', 'unit latte = 5 EUR', '2 coffees', '2 lattes', 'sum'];
  assert.match(money(sheet).rows[4], /ERR Cannot combine/);
});

test('UNIT-06: a custom unit on one currency does not merge with another currency', () => {
  const sheet = ['unit coffee = 4.5 USD', '2 coffees', '€10', 'sum'];
  assert.match(money(sheet).rows[3], /ERR Cannot combine/);
});

test('UNIT-06: a unit defined from another money unit is money too', () => {
  const lines = ['unit coffee = $4.5', 'unit big coffee = 2 coffees', '1 big coffee', '$1'];
  assert.equal(money(lines).total, 'US$ 10');
});

test('UNIT-06: units that are not money are unaffected', () => {
  assert.equal(money(['unit widget = 3.5 kg', '2 widgets', '1 kg']).total, '2.286… widgets');
});

test('UNIT-06: deleting the definition removes the money kind with it', () => {
  const engine = createEngine({ rates: FIXTURE_RATES });
  engine.evaluateLines(['unit coffee = $4.5', '3 coffees']);
  const after = engine.evaluateLines(['3 coffees', '$10']).results[0];
  assert.equal(after.type, 'error');
});

test('a name that matches a prefixed unit as a plural can still be defined', () => {
  const e = engine();
  const out = e.evaluateLines(['unit d = 8 hours', '2 d in hours', 'unit q = 2', '3 q']);
  assert.notEqual(out.results[0].type, 'error');
  assert.match(String(out.results[1].value), /16/);
  assert.match(String(out.results[3].value), /6/);
  assert.equal(e.evaluateLines(['unit widget = 3', '2 widgets']).results[1].value, 6);
});

test('a name the date grammar owns is not a unit name', () => {
  for (const name of ['mo', 'wk', 'w', 'yr', 'mos']) {
    assert.match(
      engine().evaluateLines([`unit ${name} = 5 days`]).results[0].value,
      /already a unit/,
      name
    );
  }
});

test('a custom unit accepts the common plurals of its name', () => {
  const run = (lines) => engine().evaluateLines(lines).results.at(-1);
  assert.equal(run(['unit bus = 50 kg', '2 buses']).type, 'value');
  assert.equal(run(['unit glass = 250 ml', '2 glasses']).type, 'value');
  assert.equal(run(['unit class = 3 kg', '2 classes']).type, 'value');
  assert.equal(run(['unit potato = 2 kg', '2 potatoes']).type, 'value');
  assert.equal(run(['unit potato = 2 kg', '2 potatos']).type, 'value');
  assert.equal(run(['unit leaf = 2 g', '2 leaves']).type, 'value');
  assert.equal(run(['unit pão = 2 EUR', '3 pães']).type, 'value');
  assert.equal(run(['unit pão = 2 EUR', '3 pãos']).type, 'value');
  assert.equal(run(['unit box = 3 kg', '2 boxes']).type, 'value');
});
