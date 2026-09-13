import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLines } from '../js/core/calculate.js';
import { preprocessRounding } from '../js/eval/rounding.js';

function valueOf(line) {
  return evaluateLines([line]).results[0].value;
}

test('preprocessRounding rewrites decimal-place phrases', () => {
  assert.equal(preprocessRounding('1/3 to 2 dp'), 'round(1/3, 2)');
  assert.equal(preprocessRounding('pi to 5 digits'), 'round(pi, 5)');
  assert.equal(preprocessRounding('1/3 to 2 decimal places'), 'round(1/3, 2)');
});

test('preprocessRounding rewrites whole-number rounding', () => {
  assert.equal(preprocessRounding('5.5 rounded'), 'round(5.5)');
  assert.equal(preprocessRounding('5.5 rounded up'), 'ceil(5.5)');
  assert.equal(preprocessRounding('5.5 rounded down'), 'floor(5.5)');
});

test('preprocessRounding rewrites nearest-magnitude phrases', () => {
  assert.equal(preprocessRounding('37 to nearest 10'), 'round((37) / 10) * 10');
  assert.equal(preprocessRounding('$490 rounded to nearest hundred'), 'round(($490) / 100) * 100');
  assert.equal(preprocessRounding('21 rounded up to nearest 5'), 'ceil((21) / 5) * 5');
  assert.equal(preprocessRounding('17 rounded down to nearest 3'), 'floor((17) / 3) * 3');
});

test('preprocessRounding rewrites fraction rounding', () => {
  assert.equal(preprocessRounding('0.534 to nearest 16th'), 'fraction(round((0.534) * 16), 16)');
});

test('preprocessRounding rounds an assignment right-hand side', () => {
  assert.equal(preprocessRounding('x = 5.5 rounded'), 'x = round(5.5)');
});

test('preprocessRounding leaves other expressions alone', () => {
  assert.equal(preprocessRounding('1 cm to m'), '1 cm to m');
  assert.equal(preprocessRounding('100 USD to EUR'), '100 USD to EUR');
  assert.equal(preprocessRounding('10 % 3'), '10 % 3');
  assert.equal(preprocessRounding('2 + 2'), '2 + 2');
  assert.equal(preprocessRounding('5 to 3'), '5 to 3');
});

test('evaluateLines evaluates rounding phrases', () => {
  assert.equal(valueOf('1/3 to 2 dp'), 0.33);
  assert.equal(valueOf('pi to 5 digits'), 3.14159);
  assert.equal(valueOf('5.5 rounded'), 6);
  assert.equal(valueOf('5.5 rounded down'), 5);
  assert.equal(valueOf('5.5 rounded up'), 6);
  assert.equal(valueOf('37 to nearest 10'), 40);
  assert.equal(valueOf('2100 to nearest thousand'), 2000);
  assert.equal(valueOf('21 rounded up to nearest 5'), 25);
  assert.equal(valueOf('17 rounded down to nearest 3'), 15);
});

test('evaluateLines rounds units in their displayed unit', () => {
  const twoPlaces = valueOf('4.567 m to 2 dp');
  assert.equal(twoPlaces.formatUnits(), 'm');
  assert.ok(Math.abs(twoPlaces.toNumber() - 4.57) < 1e-9);

  assert.equal(valueOf('4.567 m rounded').toNumber(), 5);
  assert.equal(valueOf('4.567 m rounded up').toNumber(), 5);
  assert.equal(valueOf('4.567 m rounded down').toNumber(), 4);
  assert.equal(valueOf('21 cm rounded up to nearest 5').toNumber(), 25);
});

test('evaluateLines rounds to a fraction', () => {
  const fraction = valueOf('0.534 to nearest 16th');
  assert.equal(fraction.type, 'Fraction');
  assert.equal(fraction.toFraction(), '9/16');
});

test('rounding keeps unit conversion and percentages working', () => {
  assert.equal(valueOf('1 cm to m').toNumber(), 0.01);
  assert.equal(valueOf('20% of 10'), 2);
  assert.equal(valueOf('10 divided by 3 to 2 dp'), 3.33);
});
