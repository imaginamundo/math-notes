import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLines, createEngine } from '../js/core/calculate.js';
import { preprocessMeasures } from '../js/eval/measures.js';

function valueOf(line) {
  return evaluateLines([line]).results[0].value;
}

function approx(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);
}

test('preprocessMeasures uses a known factor for a known subject', () => {
  assert.equal(
    preprocessMeasures('300g butter in cups'),
    '__measure((300g), (0.911 g/ml), (cups))'
  );
  assert.equal(
    preprocessMeasures('10 cups olive oil in grams'),
    '__measure((10 cups), (0.918 g/ml), (grams))'
  );
  assert.equal(
    preprocessMeasures('2 hours 4k video in GB'),
    '__measure((2 hours), (7.2 GB/h), (GB))'
  );
});

test('preprocessMeasures falls back to a default for any free-form subject', () => {
  assert.equal(preprocessMeasures('300g feathers in cups'), '__measure((300g), (1 g/ml), (cups))');
  assert.equal(preprocessMeasures('300g in cups'), '__measure((300g), (1 g/ml), (cups))');
  assert.equal(
    preprocessMeasures('2 cups of sugar in grams'),
    '__measure((2 cups), (0.845 g/ml), (grams))'
  );
});

test('preprocessMeasures leaves ordinary conversions alone', () => {
  assert.equal(preprocessMeasures('1 cm to m'), '1 cm to m');
  assert.equal(preprocessMeasures('10 km to m'), '10 km to m');
  assert.equal(preprocessMeasures('100 USD to EUR'), '100 USD to EUR');
  assert.equal(preprocessMeasures('2 + 2'), '2 + 2');
});

test('evaluateLines converts with known subjects', () => {
  approx(valueOf('300g butter in cups').toNumber(), 1.3172338);
  approx(valueOf('10 cups olive oil in grams').toNumber(), 2295);
  approx(valueOf('100g nutella in tablespoons').toNumber(), 5.3763441);
  approx(valueOf('2 hours 4k video in GB').toNumber(), 14.4);
  approx(valueOf('1 l petrol in kWh').toNumber(), 9.5);
  approx(valueOf('1 kg gold in ml').toNumber(), 51.7598343);
});

test('evaluateLines works without a dataset: any subject label converts', () => {
  approx(valueOf('300g feathers in cups').toNumber(), 1.2);
  approx(valueOf('300g in cups').toNumber(), 1.2);
  approx(valueOf('2 cups mystery stuff in grams').toNumber(), 500);
});

test('a known subject does not block a same-dimension conversion', () => {
  approx(valueOf('300g butter in kg').toNumber(), 0.3);
  approx(valueOf('1 kg gold in g').toNumber(), 1000);
});

test('the measurement system switches the volume units', () => {
  const metric = createEngine();
  approx(metric.evaluateLines(['1 cup in ml']).results[0].value.toNumber(), 250);
  approx(metric.evaluateLines(['1 gallon in l']).results[0].value.toNumber(), 4);

  const us = createEngine();
  us.registerMeasurementSystem('us');
  approx(us.evaluateLines(['1 cup in ml']).results[0].value.toNumber(), 236.5882365);
  approx(us.evaluateLines(['1 gallon in l']).results[0].value.toNumber(), 3.785411784);

  const imperial = createEngine();
  imperial.registerMeasurementSystem('imperial');
  approx(imperial.evaluateLines(['1 cup in ml']).results[0].value.toNumber(), 284.130625);
  approx(imperial.evaluateLines(['1 gallon in l']).results[0].value.toNumber(), 4.54609);
});

test('measures keep other syntax working', () => {
  assert.equal(valueOf('1 cm to m').toNumber(), 0.01);
  assert.equal(valueOf('20% of 10'), 2);
  assert.equal(valueOf('1/3 to 2 dp'), 0.33);
});
