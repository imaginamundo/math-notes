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
