import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexOfLineAt, startOfLine, sheetLines, changeCaret } from '../js/util/text.js';

const text = 'ab\ncd\n\nef';

test('indexOfLineAt counts newlines before the position', () => {
  assert.equal(indexOfLineAt(text, 0), 0);
  assert.equal(indexOfLineAt(text, 2), 0); // on the first newline
  assert.equal(indexOfLineAt(text, 3), 1);
  assert.equal(indexOfLineAt(text, 5), 1); // on the second newline
  assert.equal(indexOfLineAt(text, 6), 2); // the empty line
  assert.equal(indexOfLineAt(text, text.length), 3);
});

test('startOfLine finds where the containing line begins', () => {
  assert.equal(startOfLine(text, 0), 0);
  assert.equal(startOfLine(text, 2), 0);
  assert.equal(startOfLine(text, 3), 3);
  assert.equal(startOfLine(text, 5), 3);
  assert.equal(startOfLine(text, 6), 6);
  assert.equal(startOfLine(text, 7), 7);
});

test('sheetLines memoizes the split by text value', () => {
  const a = sheetLines('x\ny');
  assert.deepEqual(a, ['x', 'y']);
  assert.equal(sheetLines('x\ny'), a, 'the same text returns the same array');
  assert.deepEqual(sheetLines('x\nz'), ['x', 'z']);
});

test('changeCaret lands at the end of the changed region', () => {
  // Undoing a deletion: the caret ends after the restored text.
  assert.equal(changeCaret('5.5 minutes as time', '5.5 minutes as timespan'), 23);
  // Undoing an insertion at the end: the caret ends where the text was removed.
  assert.equal(changeCaret('5 + 6', '5 + '), 4);
  assert.equal(changeCaret('5 + 6\n', '5 + \n'), 4);
  // Undoing an insertion in the middle.
  assert.equal(changeCaret('abcXdef', 'abcdef'), 3);
  // Redo (the reverse direction) lands after the change too.
  assert.equal(changeCaret('5.5 minutes as timespan', '5.5 minutes as time'), 19);
  // No change.
  assert.equal(changeCaret('abc', 'abc'), 3);
});
