import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLines } from '../js/core/calculate.js';
import { preprocessScales } from '../js/eval/scales.js';
import { preprocessSymbols } from '../js/eval/symbols.js';
import { preprocessTimespan } from '../js/eval/timespan.js';

// A digit inside a name must not be rewritten by the token that follows it:
// `top10k` used to become `top10000` (scales), `top10usd` -> `top10 USD`
// (symbols) and `top5min` -> `top5 minutes` (timespan).
test('a variable name with a digit and a token stays intact', () => {
  const cases = [
    ['top10k = 5', 'top10k * 2', 10],
    ['x2k = 3', 'x2k + 1', 4],
    ['top10usd = 5', 'top10usd * 2', 10],
    ['top5min = 3', 'top5min + 1', 4],
    ['foo2min = 4', 'foo2min', 4],
    ['açai2k = 7', 'açai2k + 1', 8],
  ];
  for (const [define, use, expected] of cases) {
    const { results } = evaluateLines([define, use]);
    assert.equal(results[1].type, 'value', use);
    assert.equal(results[1].value, expected, use);
  }
});

test('the shared boundaries still rewrite real tokens', () => {
  assert.equal(preprocessScales('2k'), '2000');
  assert.equal(preprocessScales('x + 2k'), 'x + 2000');
  assert.equal(preprocessScales('top10k'), 'top10k');
  assert.equal(preprocessScales('2km'), '2km');

  assert.equal(preprocessSymbols('10USD'), '10 USD');
  assert.equal(preprocessSymbols('top10usd'), 'top10usd');

  assert.equal(preprocessTimespan('5min'), '5 minutes');
  assert.equal(preprocessTimespan('top5min'), 'top5min');
  assert.equal(preprocessTimespan('min(2, 3)'), 'min(2, 3)');
});

test('scales, durations and timespans still evaluate', () => {
  assert.equal(evaluateLines(['2k']).results[0].value, 2000);
  assert.equal(evaluateLines(['1kkk']).results[0].value, 1000000000);
  assert.equal(evaluateLines(['5min']).results[0].type, 'value');
  assert.equal(evaluateLines(['3h 5m 10s']).results[0].type, 'value');
  assert.equal(evaluateLines(['2 + min(2, 3)']).results[0].value, 4);
});
