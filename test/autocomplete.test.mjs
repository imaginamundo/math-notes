import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  wordRangeAt,
  suggestionsFor,
  applyCompletion,
  suggestionFacts,
  suggestionsFrom,
} from '../js/core/autocomplete.js';
import { VOCABULARY } from '../js/core/vocabulary.js';
import parseLine from '../js/core/parseLine.js';
import { collectUnitDefinitions } from '../js/core/userUnits.js';

test('wordRangeAt finds the word around the caret', () => {
  assert.deepEqual(wordRangeAt('100 usd', 7), {
    start: 4,
    end: 7,
    text: 'usd',
    prefix: 'usd',
    tag: false,
  });
  assert.deepEqual(wordRangeAt('300g', 4), {
    start: 3,
    end: 4,
    text: 'g',
    prefix: 'g',
    tag: false,
  });
  assert.deepEqual(wordRangeAt('a + sq', 6), {
    start: 4,
    end: 6,
    text: 'sq',
    prefix: 'sq',
    tag: false,
  });
  // Mid-word: the whole word is replaced, not just the part before the caret.
  assert.deepEqual(wordRangeAt('usd', 1), {
    start: 0,
    end: 3,
    text: 'usd',
    prefix: 'u',
    tag: false,
  });
});

test('wordRangeAt recognises a #tag, including `-` inside it', () => {
  assert.deepEqual(wordRangeAt('#food', 5), {
    start: 0,
    end: 5,
    text: '#food',
    prefix: '#food',
    tag: true,
  });
  assert.deepEqual(wordRangeAt('#', 1), { start: 0, end: 1, text: '#', prefix: '#', tag: true });
  assert.deepEqual(wordRangeAt('#my-tag', 7), {
    start: 0,
    end: 7,
    text: '#my-tag',
    prefix: '#my-tag',
    tag: true,
  });
  // A lone `-` is arithmetic, not part of a tag.
  assert.deepEqual(wordRangeAt('a-b', 3), { start: 2, end: 3, text: 'b', prefix: 'b', tag: false });
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

test('suggestionsFor keeps tags and names in separate modes', () => {
  const entries = [
    { text: '#food', kind: 'tag' },
    { text: '#fuel', kind: 'tag' },
    { text: 'foo', kind: 'function' },
  ];
  assert.deepEqual(
    suggestionsFor('#fo', entries, 8).map((entry) => entry.text),
    ['#food']
  );
  assert.deepEqual(
    suggestionsFor('#', entries, 8).map((entry) => entry.text),
    ['#food', '#fuel']
  );
  // Without a `#`, tag entries are hidden.
  assert.deepEqual(
    suggestionsFor('fo', entries, 8).map((entry) => entry.text),
    ['foo']
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

const listFor = (lines) => suggestionsFrom(lines.map(suggestionFacts));
const textsOf = (list, kind) => list.filter((entry) => entry.kind === kind).map((e) => e.text);

test('suggestionFacts reads one line: its variable, unit definition and tags', () => {
  assert.deepEqual(suggestionFacts('x = 1'), { variable: 'x', fn: null, unit: null, tags: [] });
  assert.deepEqual(suggestionFacts('monthly rent = 1500'), {
    variable: 'monthly rent',
    fn: null,
    unit: null,
    tags: [],
  });
  assert.deepEqual(suggestionFacts('20 #food #urgent'), {
    variable: null,
    fn: null,
    unit: null,
    tags: ['food', 'urgent'],
  });
  assert.deepEqual(suggestionFacts('Price: 2'), { variable: null, fn: null, unit: null, tags: [] });
});

test('a unit definition names a unit, not a variable', () => {
  const facts = suggestionFacts('unit box = 12');
  assert.equal(facts.variable, null);
  assert.deepEqual(facts.unit, { name: 'box', aliases: ['boxes'] });
});

test('suggestionFacts accepts an already parsed line', () => {
  assert.deepEqual(suggestionFacts(parseLine('x = 1')), suggestionFacts('x = 1'));
});

test('suggestionsFrom lists assigned names, single and multi word, once each', () => {
  const list = listFor([
    'x = 1',
    'monthly rent = 1500',
    'Price: 2',
    'y = 3',
    'x = 4',
    'unit box = 12',
  ]);
  assert.deepEqual(textsOf(list, 'variable'), ['x', 'monthly rent', 'y']);
});

test('suggestionsFrom lists the tags used in the sheet, once each', () => {
  const list = listFor(['20 #food #urgent', '30 #food', '#food', 'x = 1']);
  assert.deepEqual(
    list.filter((entry) => entry.kind === 'tag'),
    [
      { text: '#food', kind: 'tag' },
      { text: '#urgent', kind: 'tag' },
    ]
  );
});

test('suggestionsFrom offers a custom unit with its plural, first definition winning', () => {
  const list = listFor(['unit widget = 3.5 kg', 'unit Widget = 9 kg', 'unit monthly rent = 1500']);
  assert.deepEqual(
    list.filter((entry) => entry.kind === 'unit'),
    [
      { text: 'widget', kind: 'unit', detail: 'custom unit' },
      { text: 'widgets', kind: 'unit', detail: 'custom unit' },
      { text: 'monthly rent', kind: 'unit', detail: 'custom unit' },
      { text: 'monthly rents', kind: 'unit', detail: 'custom unit' },
    ]
  );
});

test('suggestionsFrom orders variables, then units, then tags', () => {
  const list = listFor(['#food', 'unit box = 12', 'x = 1']);
  assert.deepEqual([...new Set(list.map((entry) => entry.kind))], ['variable', 'unit', 'tag']);
});

test('suggestionsFrom accepts any iterable and an empty sheet', () => {
  assert.deepEqual(suggestionsFrom([]), []);
  assert.deepEqual(suggestionsFrom(new Set([suggestionFacts('x = 1')])), [
    { text: 'x', kind: 'variable' },
  ]);
});

test('collectUnitDefinitions lists custom units with their plurals', () => {
  assert.deepEqual(collectUnitDefinitions(['unit widget = 3.5 kg', 'unit monthly rent = 1500']), [
    { name: 'widget', aliases: ['widgets'] },
    { name: 'monthly rent', aliases: ['monthly rents'] },
  ]);
});

test('the vocabulary is well formed and unique', () => {
  assert.ok(VOCABULARY.length > 50);
  const seen = new Set();
  for (const entry of VOCABULARY) {
    assert.equal(typeof entry.text, 'string');
    assert.ok(['keyword', 'function', 'constant', 'unit'].includes(entry.kind));
    const key = `${entry.kind === 'unit' ? 'unit' : 'word'}:${entry.text}`;
    assert.ok(!seen.has(key), `duplicate ${entry.text}`);
    seen.add(key);
  }
  const kinds = Object.fromEntries(VOCABULARY.map((entry) => [entry.text, entry.kind]));
  assert.equal(kinds.sqrt, 'function');
  assert.equal(kinds.USD, 'unit');
  assert.equal(kinds.prev, 'keyword');
  assert.equal(kinds.pi, 'constant');
});

test('wordRangeAt spans non-ASCII words and tags', () => {
  assert.deepEqual(wordRangeAt('açai', 4), {
    start: 0,
    end: 4,
    text: 'açai',
    prefix: 'açai',
    tag: false,
  });
  assert.deepEqual(wordRangeAt('#aáeáãd', 7), {
    start: 0,
    end: 7,
    text: '#aáeáãd',
    prefix: '#aáeáãd',
    tag: true,
  });
});

test('completing a later word of a multi-word name replaces the earlier words too', () => {
  const take = (value, name) => {
    const range = wordRangeAt(value, value.length);
    return applyCompletion(value, range, name).value;
  };
  assert.equal(take('2 * monthly re', 'monthly rent'), '2 * monthly rent');
  assert.equal(take('100 * tax ra', 'tax rate'), '100 * tax rate');
  assert.equal(take('3 monthly fe', 'monthly fees'), '3 monthly fees');
  assert.equal(take('2 * m', 'monthly rent'), '2 * monthly rent');
  assert.equal(take('2 * Monthly re', 'monthly rent'), '2 * monthly rent');
});

test('a multi-word name that is already fully typed is not offered again', () => {
  const names = [{ text: 'monthly rent', kind: 'variable' }];
  const offer = (value) =>
    suggestionsFor(wordRangeAt(value, value.length).prefix, names, 8, {
      before: value.slice(0, wordRangeAt(value, value.length).start),
    }).map((entry) => entry.text);
  assert.deepEqual(offer('2 * monthly re'), ['monthly rent']);
  assert.deepEqual(offer('2 * monthly rent'), []);
});

test('a function that already has its bracket does not get another', () => {
  const range = wordRangeAt('sqr(16)', 3);
  assert.equal(applyCompletion('sqr(16)', range, 'sqrt', { paren: true }).value, 'sqrt(16)');
  assert.equal(
    applyCompletion('sqr (16)', wordRangeAt('sqr (16)', 3), 'sqrt', { paren: true }).value,
    'sqrt (16)'
  );
  assert.equal(applyCompletion('sq', wordRangeAt('sq', 2), 'sqrt', { paren: true }).value, 'sqrt(');
});

test('after a number or to/in/as only units are offered, units first', () => {
  const texts = (before, prefix) =>
    suggestionsFor(prefix, VOCABULARY, 8, { before }).map((entry) => entry.text);
  const kinds = (before, prefix) =>
    suggestionsFor(prefix, VOCABULARY, 8, { before }).map((entry) => entry.kind);
  assert.ok(!kinds('3 ', 'mi').some((kind) => kind !== 'unit'));
  assert.ok(texts('3 ', 'mi').includes('min'));
  assert.ok(!texts('3 ', 'we').includes('weekday'));
  assert.ok(!kinds('2 h to ', 'mi').some((kind) => kind !== 'unit'));
  assert.ok(!kinds('12 ', 'in').some((kind) => kind === 'constant' || kind === 'function'));
  // Elsewhere functions and keywords still come first.
  assert.equal(suggestionsFor('mi', VOCABULARY, 8, { before: '2 * ' })[0].kind, 'function');
});

test('the vocabulary offers only names the engine has, with accurate hints', () => {
  const byText = new Map(VOCABULARY.map((entry) => [entry.text, entry]));
  for (const gone of ['trunc', 'length']) assert.equal(byText.has(gone), false, gone);
  assert.ok(byText.has('fix') && byText.has('size'));
  assert.match(byText.get('log').detail, /natural/);
});

test('only names usable at the caret are offered', () => {
  const facts = (lines) => lines.map(suggestionFacts);
  const names = (lines) => suggestionsFrom(facts(lines)).map((entry) => entry.text);
  assert.deepEqual(names(['cube(x) = x^3']), ['cube']);
  assert.deepEqual(names(['sq = f(x) = x^2']), ['sq']);
  assert.deepEqual(names(['total = 5', 'end = 1', 'prev = 2', 'today = 3', '__x = 1']), []);
  assert.deepEqual(names(['n[2] = 99', 'p.x = 5', '// y = 2']), []);
  assert.deepEqual(names(['tax rate = 5']), ['tax rate']);
  const list = suggestionsFrom(facts(['double = f(x) = x * 2']));
  assert.equal(list[0].kind, 'function');
});
