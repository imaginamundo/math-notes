import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexOfLineAt, startOfLine } from '../js/util/text.js';

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
