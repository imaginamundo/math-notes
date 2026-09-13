import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLines } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';
import { preprocessTimespan } from '../js/eval/timespan.js';

function valueOf(line) {
  return formatResult(evaluateLines([line]).results[0].value);
}

test('preprocessTimespan rewrites as timespan and double time units', () => {
  assert.equal(preprocessTimespan('5.5 minutes as timespan'), '__timespan(5.5 minutes)');
  assert.equal(
    preprocessTimespan('12.5 minutes in minutes and seconds'),
    '__timespanParts((12.5 minutes), "minute", "second")'
  );
});

test('preprocessTimespan joins consecutive time components', () => {
  assert.equal(preprocessTimespan('3h 5m 10s'), '__timespan(3 hours + 5 minutes + 10 seconds)');
  assert.equal(
    preprocessTimespan('3h 5m 10s in seconds'),
    '3 hours + 5 minutes + 10 seconds in seconds'
  );
  assert.equal(preprocessTimespan('1 cm to m'), '1 cm to m');
  assert.equal(preprocessTimespan('min(1, 2)'), 'min(1, 2)');
});

test('as timespan decomposes a duration', () => {
  assert.equal(valueOf('5.5 minutes as timespan'), '5 min 30 s');
  assert.equal(valueOf('4.54 hours as timespan'), '4 hours 32 minutes 24 seconds');
  assert.equal(valueOf('72 days as timespan'), '10 weeks 2 days');
});

test('a bare timespan displays as components', () => {
  assert.equal(valueOf('3 hours 5 minutes 10 seconds'), '3 hours 5 minutes 10 seconds');
  assert.equal(valueOf('3h 5m 10s'), '3 hours 5 minutes 10 seconds');
});

test('a timespan converts to a single unit', () => {
  assert.equal(valueOf('3h 5m 10s in seconds'), '11,110 seconds');
  assert.equal(valueOf('3 hours 5 minutes 10 seconds in seconds'), '11,110 seconds');
});

test('double time units split into exactly two components', () => {
  assert.equal(valueOf('12.5 minutes in minutes and seconds'), '12 min 30 s');
  assert.equal(valueOf('1.4 weeks in hours and minutes'), '235 hours 12 min');
  assert.equal(valueOf('4.5 weeks in days and hours'), '31 days 12 hours');
});

test('a timespan is a duration that survives arithmetic', () => {
  const { results } = evaluateLines(['5.5 minutes as timespan', 'line(1) + 1h']);
  assert.equal(formatResult(results[1].value), '1 hour 5 minutes 30 seconds');

  const { results: withPrev } = evaluateLines(['5.5 minutes as timespan', 'prev + 30 min']);
  assert.equal(formatResult(withPrev[1].value), '35 min 30 s');

  const { results: doubled } = evaluateLines(['5.5 minutes as timespan', 'prev * 2']);
  assert.equal(formatResult(doubled[1].value), '11 min');
});
