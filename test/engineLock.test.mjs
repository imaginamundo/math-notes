import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';
import { create, all } from '../js/lib/math.bundle.min.js';
import { lockDown, BLOCKED } from '../js/core/engineLock.js';
import { FIXTURE_RATES } from './helpers/rates.mjs';

// REVIEW.md PRE-02: a sheet line must not be able to rewrite the shared engine.
const VICTIM = [
  'salary = $5000',
  'salary to EUR',
  '100 * 1.15',
  '1 / 3',
  '2 km to m',
  '30 hours at $30/hour',
  '100 m to ft',
  '10 > 9 ? 1 : 0',
  '1 == 1.4',
  'sqrt(-4)',
  '0.5 + 0.25',
];

const HOSTILE = [
  'createUnit("USD", "2 EUR", {override: true})',
  'config({number: "BigNumber", precision: 2})',
  'createUnit("km", "1 m", {override: true})',
  'createUnit("hour", "1 min", {override: true})',
  'createUnit("m", "1 ft", {override: true})',
  'config({relTol: 0.5})',
  'config({number: "Fraction"})',
  'config({predictable: true})',
  'createUnit("gizmo", "2 kg")',
  'evaluate("config({relTol: 0.5})")',
  'parser().evaluate("createUnit(\\"km\\", \\"1 m\\", {override: true})")',
  'compile("1 + 1").evaluate()',
  'simplify("x + x")',
  'FunctionNode("config", [])',
  'help("sqrt")',
];

const shown = (engine, lines) =>
  engine.evaluateLines(lines).results.map((r) => `${r.type}:${formatResult(r.value)}`);

test('lockDown stubs the blocked functions and keeps the real ones for the engine', () => {
  const math = create(all);
  const trusted = lockDown(math);
  assert.throws(() => math.evaluate('1 + 1'), /"evaluate" is not available/);
  assert.throws(() => trusted.evaluate('config({relTol: 0.5})'), /"config" is not available/);
  assert.throws(() => math.createUnit('zz', '2 m'), /not available in a sheet/);
  assert.equal(trusted.evaluate('2 + 2'), 4);
  assert.equal(typeof trusted.createUnit, 'function');
  assert.equal(trusted.evaluate('sqrt(16)'), 4, 'ordinary maths still works');
  assert.ok(BLOCKED.includes('config') && BLOCKED.includes('createUnit'));
});

test('PRE-02: hostile lines are errors and change nothing', () => {
  const engine = createEngine({ rates: FIXTURE_RATES });
  const before = shown(engine, VICTIM);
  const hostile = engine.evaluateLines(HOSTILE).results;
  for (const [index, result] of hostile.entries()) {
    assert.equal(result.type, 'error', `${HOSTILE[index]} should be an error`);
    assert.match(String(result.value), /not available in a sheet|Undefined/, HOSTILE[index]);
  }
  assert.deepEqual(shown(engine, VICTIM), before, 'later sheets are unaffected');
  assert.deepEqual(
    shown(engine, VICTIM),
    shown(createEngine({ rates: FIXTURE_RATES }), VICTIM),
    'and match a fresh engine'
  );
});

test('the engine still registers rates, units and measurement systems after the lock', () => {
  const engine = createEngine({ rates: FIXTURE_RATES });
  engine.registerCurrencyRates({ base: 'EUR', rates: { USD: 2 } });
  assert.match(formatResult(engine.evaluateLines(['10 EUR to USD']).results[0].value), /20/);
  engine.registerMeasurementSystem('us');
  assert.equal(
    engine.evaluateLines(['unit widget = 3 kg', '2 widgets to kg']).results[1].type,
    'value'
  );
  assert.equal(engine.evaluateLines(['2 + 2']).results[0].value, 4);
});
