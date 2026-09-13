import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  wordRangeAt,
  suggestionsFor,
  applyCompletion,
  collectAssignments,
} from '../js/core/autocomplete.js';
import { VOCABULARY } from '../js/core/vocabulary.js';

test('wordRangeAt finds the word around the caret', () => {
  assert.deepEqual(wordRangeAt('100 usd', 7), { start: 4, end: 7, text: 'usd', prefix: 'usd' });
  assert.deepEqual(wordRangeAt('300g', 4), { start: 3, end: 4, text: 'g', prefix: 'g' });
  assert.deepEqual(wordRangeAt('a + sq', 6), { start: 4, end: 6, text: 'sq', prefix: 'sq' });
  // Mid-word: the whole word is replaced, not just the part before the caret.
  assert.deepEqual(wordRangeAt('usd', 1), { start: 0, end: 3, text: 'usd', prefix: 'u' });
});

test('wordRangeAt ignores numbers and empty positions', () => {
  assert.equal(wordRangeAt('3.5', 3), null);
  assert.equal(wordRangeAt('a + ', 4), null);
  assert.equal(wordRangeAt('', 0), null);
});

test('suggestionsFor ranks and limits matches', () => {
  const entries = [
    { text: 'bass', kind: 'variable' },
    { text: 'base', kind: 'keyword' },
    { text: 'basic', kind: 'function' },
    { text: 'database', kind: 'unit' },
  ];
  assert.deepEqual(
    suggestionsFor('ba', entries, 8).map((entry) => entry.text),
    ['bass', 'base', 'basic', 'database']
  );
  assert.deepEqual(
    suggestionsFor('ba', entries, 2).map((entry) => entry.text),
    ['bass', 'base']
  );
  // An exact match would change nothing, so it is dropped.
  assert.deepEqual(
    suggestionsFor(
      'base',
      [
        { text: 'base', kind: 'keyword' },
        { text: 'database', kind: 'unit' },
      ],
      8
    ).map((entry) => entry.text),
    ['database']
  );
});

test('suggestionsFor matches case-insensitively and later in the name', () => {
  const entries = [{ text: 'USD', kind: 'unit' }];
  assert.deepEqual(
    suggestionsFor('usd', entries, 8).map((entry) => entry.text),
    ['USD']
  );
});

test('applyCompletion replaces the word, bracketing functions', () => {
  assert.deepEqual(applyCompletion('100 usd', wordRangeAt('100 usd', 7), 'USD'), {
    value: '100 USD',
    caret: 7,
  });
  assert.deepEqual(applyCompletion('sq', wordRangeAt('sq', 2), 'sqrt', { paren: true }), {
    value: 'sqrt(',
    caret: 5,
  });
});

test('collectAssignments lists assigned names, single and multi word', () => {
  assert.deepEqual(collectAssignments(['x = 1', 'monthly rent = 1500', 'Price: 2', 'y = 3']), [
    'x',
    'monthly rent',
    'y',
  ]);
});

test('the vocabulary is well formed and unique', () => {
  assert.ok(VOCABULARY.length > 50);
  const seen = new Set();
  for (const entry of VOCABULARY) {
    assert.equal(typeof entry.text, 'string');
    assert.ok(['keyword', 'function', 'constant', 'unit'].includes(entry.kind));
    assert.ok(!seen.has(entry.text), `duplicate ${entry.text}`);
    seen.add(entry.text);
  }
  const kinds = Object.fromEntries(VOCABULARY.map((entry) => [entry.text, entry.kind]));
  assert.equal(kinds.sqrt, 'function');
  assert.equal(kinds.USD, 'unit');
  assert.equal(kinds.prev, 'keyword');
  assert.equal(kinds.pi, 'constant');
});
