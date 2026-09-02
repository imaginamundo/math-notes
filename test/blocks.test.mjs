import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupLines, dangles, isFence } from '../js/core/blocks.js';

const kinds = (lines) => groupLines(lines).map((entry) => entry.kind);
const owners = (lines) => groupLines(lines).map((entry) => entry.ownerIndex);
const starts = (lines) => groupLines(lines).map((entry) => entry.startIndex);
const codes = (lines) => groupLines(lines).map((entry) => entry.code);

test('groupLines returns exactly one entry per physical line', () => {
  const lines = ['a', '', '###', 'b', '###', 'c +', 'd'];
  assert.equal(groupLines(lines).length, lines.length);
  assert.equal(groupLines([]).length, 0);
});

test('a plain sheet is untouched: every line is its own code group', () => {
  const lines = ['1 + 1', 'x = 2', '# note', 'Price: 10'];
  assert.deepEqual(kinds(lines), ['code', 'code', 'code', 'code']);
  assert.deepEqual(owners(lines), [0, 1, 2, 3]);
  // The code is the line verbatim, comment and all, so parseLine sees exactly
  // what it saw before grouping existed.
  assert.deepEqual(codes(lines), lines);
});

test('a ### fence opens and closes a block comment', () => {
  const lines = ['a = 1', '###', 'notes here', 'more notes', '###', 'b = 2'];
  assert.deepEqual(kinds(lines), ['code', 'fence', 'comment', 'comment', 'fence', 'code']);
});

test('an unterminated fence comments out the rest of the sheet', () => {
  const lines = ['a = 1', '###', 'notes', 'still notes'];
  assert.deepEqual(kinds(lines), ['code', 'fence', 'comment', 'comment']);
});

test('a blank line inside a block is comment text, not a block separator', () => {
  const lines = ['###', 'notes', '', 'more', '###'];
  assert.deepEqual(kinds(lines), ['fence', 'comment', 'comment', 'comment', 'fence']);
});

test('a third fence reopens: fences toggle', () => {
  const lines = ['###', 'a', '###', 'b', '###', 'c'];
  assert.deepEqual(kinds(lines), ['fence', 'comment', 'fence', 'code', 'fence', 'comment']);
});

test('a fence may carry trailing text on the same line', () => {
  const lines = ['### assumptions', 'rent is fixed', '### end'];
  assert.deepEqual(kinds(lines), ['fence', 'comment', 'fence']);
  assert.ok(isFence('   ### indented'));
  assert.equal(isFence('## not a fence'), false);
  assert.equal(isFence('a ### mid-line'), false);
});

test('# line comments still behave as before', () => {
  const lines = ['# just a note', '1 + 1 # trailing'];
  assert.deepEqual(kinds(lines), ['code', 'code']);
  assert.deepEqual(codes(lines), lines);
});

test('a dangling operator continues onto the next line', () => {
  const lines = ['x = 1 +', '2', 'y = 3'];
  assert.deepEqual(kinds(lines), ['continuation', 'code', 'code']);
  assert.deepEqual(owners(lines), [1, 1, 2]);
  assert.deepEqual(starts(lines), [0, 0, 2]);
  assert.equal(codes(lines)[1], 'x = 1 + 2');
});

test('every dangling operator continues, and a complete line does not', () => {
  for (const operator of ['+', '-', '*', '/', '^', '(', ',']) {
    assert.equal(dangles(`1 ${operator}`), true, `"${operator}" should dangle`);
  }
  for (const complete of ['1 + 1', 'x = 2', '', '   ', 'sum', '5)', '2%']) {
    assert.equal(dangles(complete), false, `"${complete}" should not dangle`);
  }
});

test('a run spans as many lines as keep dangling', () => {
  const lines = ['sum(1,', '  2,', '  3)'];
  assert.deepEqual(kinds(lines), ['continuation', 'continuation', 'code']);
  assert.deepEqual(owners(lines), [2, 2, 2]);
  assert.equal(codes(lines)[2], 'sum(1, 2, 3)');
});

test('an explicit trailing backslash continues, and is stripped from the join', () => {
  const lines = ['1 + 2 \\', '+ 3'];
  assert.deepEqual(kinds(lines), ['continuation', 'code']);
  assert.equal(codes(lines)[1], '1 + 2 + 3');
  assert.equal(codes(lines)[1].includes('\\'), false);
});

test('a dangling last line of the sheet stands alone', () => {
  // It stays a code line so the user sees the syntax error, rather than the
  // line being silently swallowed.
  const lines = ['1 +'];
  assert.deepEqual(kinds(lines), ['code']);
  assert.equal(codes(lines)[0], '1 +');
});

test('a blank line interrupts a continuation run', () => {
  const lines = ['1 +', '', '2'];
  assert.deepEqual(kinds(lines), ['code', 'blank', 'code']);
  assert.deepEqual(codes(lines), ['1 +', '', '2']);
});

test('a fence interrupts a continuation run', () => {
  const lines = ['1 +', '###', 'notes'];
  assert.deepEqual(kinds(lines), ['code', 'fence', 'comment']);
});

test('a comment-only line in the middle of a run is transparent', () => {
  const lines = ['1 +', '# why we add', '2'];
  assert.deepEqual(kinds(lines), ['continuation', 'comment', 'code']);
  assert.deepEqual(owners(lines), [2, 2, 2]);
  assert.equal(codes(lines)[2], '1 + 2');
});

test('a comment-only line before an interruption is still just a comment', () => {
  const lines = ['1 +', '# orphaned', '', '2'];
  assert.deepEqual(kinds(lines), ['code', 'comment', 'blank', 'code']);
  assert.equal(codes(lines)[0], '1 +');
});

test('trailing comments on continued lines are dropped from the join', () => {
  const lines = ['1 + # first half', '2 # second half'];
  assert.deepEqual(kinds(lines), ['continuation', 'code']);
  assert.equal(codes(lines)[1], '1 + 2');
});

test('blank lines are their own kind', () => {
  assert.deepEqual(kinds(['a', '', '   ', '\t', 'b']), ['code', 'blank', 'blank', 'blank', 'code']);
});

test('startIndex points at the first physical line of every group', () => {
  const lines = ['a', 'sum(1,', '2)', 'b'];
  assert.deepEqual(starts(lines), [0, 1, 1, 3]);
});
