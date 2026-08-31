import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexOfLineAt } from '../js/shortcuts.js';

test('indexOfLineAt resolves the line under a caret position', () => {
  assert.equal(indexOfLineAt('a\nb\nc', 0), 0);
  assert.equal(indexOfLineAt('a\nb\nc', 1), 0);
  assert.equal(indexOfLineAt('a\nb\nc', 2), 1);
  assert.equal(indexOfLineAt('a\nb\nc', 3), 1);
  assert.equal(indexOfLineAt('a\nb\nc', 4), 2);
  assert.equal(indexOfLineAt('a\nb\nc', 5), 2);
  assert.equal(indexOfLineAt('', 0), 0);
});
