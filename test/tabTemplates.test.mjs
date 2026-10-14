import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/core/calculate.js';
import { getTabTemplates } from '../js/ui/tabTemplates.js';
import { FIXTURE_RATES } from './helpers/rates.mjs';

// A template is the first thing a new tab shows, so each one must be a working
// sheet: no error rows, and a total (REVIEW.md AGG-02).
const templates = getTabTemplates();

test('there are starter templates, each with a name and content', () => {
  assert.ok(templates.length >= 5);
  for (const { id, name, content } of templates) {
    assert.ok(id && name && content, `template ${id} is incomplete`);
  }
});

for (const { id, content } of templates) {
  test(`AGG-02: the ${id} template evaluates without errors`, () => {
    const lines = content.split('\n');
    const { results, total } = createEngine({ rates: FIXTURE_RATES }).evaluateLines(lines);
    const errors = results
      .map((result, index) =>
        result && result.type === 'error' ? `${lines[index]} → ${result.value}` : null
      )
      .filter(Boolean);
    assert.deepEqual(errors, []);
    assert.notEqual(total, null, 'the total bar is empty');
  });
}
