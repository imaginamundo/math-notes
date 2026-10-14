import { test } from 'node:test';
import assert from 'node:assert/strict';
import { create, all } from '../js/lib/math.bundle.min.js';
import { tagAggregate, tagAggregateMode, tagError, substituteTags } from '../js/core/tags.js';
import parseLine from '../js/core/parseLine.js';

const math = create(all);
const row = (value, ...tags) => ({ type: 'value', value, tags });

test('tagAggregateMode reads a bare tag request and the keyword forms', () => {
  assert.equal(tagAggregateMode(''), 'sum');
  assert.equal(tagAggregateMode('   '), 'sum');
  assert.equal(tagAggregateMode('sum'), 'sum');
  assert.equal(tagAggregateMode('total'), 'sum');
  assert.equal(tagAggregateMode('average'), 'average');
  assert.equal(tagAggregateMode('AVG'), 'average');
  assert.equal(tagAggregateMode('average of'), 'average');
});

test('tagAggregateMode leaves an ordinary expression alone', () => {
  assert.equal(tagAggregateMode('2 + 2'), null);
  assert.equal(tagAggregateMode('sum(1, 2)'), null);
  assert.equal(tagAggregateMode('summary'), null);
});

test('tagAggregate sums the rows above that carry the tag', () => {
  const results = [row(10, 'food'), row(5, 'rent'), row(2, 'food'), row(100, 'food')];
  assert.equal(tagAggregate(results, ['food'], 3, 'sum', math), 12);
  assert.equal(tagAggregate(results, ['food'], 3, 'average', math), 6);
});

test('requesting several tags counts each matching row once, at its per-tag share', () => {
  // Pinned by the engine test "a row shared between several tags is split between
  // them": a row carrying two requested tags is not counted in full.
  const results = [row(10, 'food'), row(5, 'rent'), row(7, 'food', 'rent')];
  assert.equal(tagAggregate(results, ['food'], 3, 'sum', math), 13.5);
  assert.equal(tagAggregate(results, ['rent'], 3, 'sum', math), 8.5);
  assert.equal(tagAggregate(results, ['food', 'rent'], 3, 'sum', math), 18.5);
});

test('a row tagged for several people is split between them', () => {
  const results = [row(10, 'ann', 'bo'), row(4, 'ann')];
  assert.equal(tagAggregate(results, ['ann'], 2, 'sum', math), 9);
  assert.equal(tagAggregate(results, ['bo'], 2, 'sum', math), 5);
});

test('the split also divides a unit value', () => {
  const results = [row(math.unit(10, 'kg'), 'ann', 'bo')];
  const share = tagAggregate(results, ['ann'], 1, 'sum', math);
  assert.equal(share.toString(), '5 kg');
});

test('tagAggregate ignores errors, aggregate rows, untagged rows and rows at or below the request', () => {
  const results = [
    { type: 'error', value: 'boom', tags: ['food'] },
    { type: 'value', value: 50, tags: ['food'], aggregate: true },
    { type: 'value', value: 1 },
    undefined,
    row(3, 'food'),
    row(900, 'food'),
  ];
  assert.equal(tagAggregate(results, ['food'], 5, 'sum', math), 3);
});

test('tagAggregate returns null when nothing carries the tag', () => {
  assert.equal(tagAggregate([row(1, 'a')], ['b'], 1, 'sum', math), null);
  assert.equal(tagAggregate([], ['a'], 0, 'sum', math), null);
});

test('tagError lists every requested tag', () => {
  assert.equal(tagError(['food']), 'No values tagged #food');
  assert.equal(tagError(['a', 'b']), 'No values tagged #a, #b');
});

test('substituteTags replaces a tag with a scope variable holding its sum', () => {
  const results = [row(10, 'food'), row(5, 'food')];
  const out = substituteTags(parseLine('#food * 2'), results, 2, math);
  assert.equal(out.error, null);
  assert.equal(out.text.trim(), '__tag_sum_food * 2');
  assert.deepEqual(out.values, { __tag_sum_food: 15 });
});

test('substituteTags reuses one variable for a repeated tag', () => {
  const results = [row(4, 'a')];
  const out = substituteTags(parseLine('#a + #a'), results, 1, math);
  assert.equal(out.error, null);
  assert.equal(out.text.trim(), '__tag_sum_a + __tag_sum_a');
  assert.deepEqual(out.values, { __tag_sum_a: 4 });
});

test('substituteTags reports the first tag with no rows and stops substituting', () => {
  const results = [row(4, 'a')];
  const out = substituteTags(parseLine('#missing + #a'), results, 1, math);
  assert.equal(out.error, 'No values tagged #missing');
  assert.deepEqual(out.values, {});
});

test('substituteTags keeps a trailing comment out of the expression', () => {
  const results = [row(4, 'a')];
  const out = substituteTags(parseLine('#a + 1 # note'), results, 1, math);
  assert.equal(out.error, null);
  assert.ok(!out.text.includes('note'));
});
