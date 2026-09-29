import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateLines } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';

// The English sources are the reference for the documented results. A hint is a
// checked result when it is exactly `returns <value>` and the value is a real
// output (no prose, no approximation). Currency and relative-date examples are
// skipped because they depend on live rates or the day the test runs.
const CHECKED = /^returns ([^()—]+)$/;
const RESULT = /^[-\d]/;
const SKIP =
  /[$€£¥₹₩₺]|\b(USD|EUR|GBP|BRL|CAD|CHF|JPY|AUD|RON|IDR|MYR|PHP|THB|ILS|HUF|CZK|PLN|TRY|KRW|INR|HKD|NZD|SGD|MXN|NOK|SEK|DKK|ISK|BGN|ZAR)\b|today|tomorrow|yesterday|Christmas|Halloween|\bnow\b|\bin this\b/;

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = join(root, 'docs-src', 'src', 'en');

function examples() {
  const out = [];
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.md'))) {
    const md = readFileSync(join(dir, file), 'utf8');
    const fence = /^```calc(?:[ \t]+(.*))?\n([\s\S]*?)\n```/gm;
    let match;
    while ((match = fence.exec(md)) !== null) {
      out.push({ file, hint: (match[1] || '').trim(), code: match[2] });
    }
  }
  return out;
}

test('documented example results match the engine', () => {
  const failures = [];
  for (const { file, hint, code } of examples()) {
    const checked = CHECKED.exec(hint);
    if (!checked) continue;
    const expected = checked[1].trim();
    if (!RESULT.test(expected) || SKIP.test(code)) continue;
    const lines = code.split('\n');
    const { results } = evaluateLines(lines);
    const actual = formatResult(results[results.length - 1].value);
    if (actual !== expected) {
      failures.push(
        `${file}: ${JSON.stringify(lines[lines.length - 1])} — doc ${JSON.stringify(
          expected
        )}, app ${JSON.stringify(actual)}`
      );
    }
  }
  assert.deepEqual(failures, []);
});
