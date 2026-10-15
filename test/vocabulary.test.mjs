import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/core/calculate.js';
import { VOCABULARY } from '../js/core/vocabulary.js';
import { FIXTURE_RATES } from './helpers/rates.mjs';
import { ratchet } from './helpers/ratchet.mjs';

// Autocomplete offers a word only if the engine understands it: an offered unit,
// constant or function that errors with "Undefined ..." teaches the user a name
// that does not work (REVIEW.md UIE-02, UIE-03, UNIT-11, UNIT-12, UNIT-14).
// Keywords are phrases with their own grammar, so they are not probed here.
const engine = createEngine({ rates: FIXTURE_RATES });
const run = (line) => engine.evaluateLines([line]).results[0];

const UNDEFINED = /Undefined (symbol|function)|is not defined|is not a known function/;

function failure(entry) {
  const { text, kind } = entry;
  if (kind === 'unit') {
    const result = run(`5 ${text}`);
    return result.type === 'error' ? result.value : null;
  }
  if (kind === 'constant') {
    const result = run(text);
    return result.type === 'error' ? result.value : null;
  }
  if (kind === 'function') {
    // A wrong-arity or wrong-type error is fine: it proves the name exists.
    const result = run(`${text}(1)`);
    return result.type === 'error' && UNDEFINED.test(result.value) ? result.value : null;
  }
  return null;
}

test('the probe itself recognises a name the engine knows and one it does not', () => {
  assert.equal(failure({ kind: 'unit', text: 'kg' }), null);
  assert.equal(failure({ kind: 'function', text: 'sqrt' }), null);
  assert.equal(failure({ kind: 'constant', text: 'pi' }), null);
  assert.ok(failure({ kind: 'unit', text: 'notaunit' }));
  assert.ok(failure({ kind: 'function', text: 'notafunction' }));
});

test('every unit, constant and function autocomplete offers is understood by the engine', () => {
  const failing = [];
  for (const entry of VOCABULARY) {
    if (failure(entry)) failing.push(`${entry.kind}:${entry.text}`);
  }
  ratchet('vocabulary', failing);
});

test('the vocabulary has no duplicate names', () => {
  const seen = new Set();
  for (const { text } of VOCABULARY) {
    assert.ok(!seen.has(text), `duplicate ${text}`);
    seen.add(text);
  }
});
