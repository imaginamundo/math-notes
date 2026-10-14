import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEngine } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';
import { FIXTURE_RATES } from './helpers/rates.mjs';
import { ratchet } from './helpers/ratchet.mjs';

// Every ```calc block in the documentation and the Examples is something a
// reader will copy into the app, so none of them should show an error unless the
// page is demonstrating one. docsExamples.test.mjs checks the results the docs
// state; this checks that the rest do not fail (REVIEW.md DOC-04, DOC-12 and
// future drift). Blocks that fail today are in test/ratchets/docs-errors.json.
const root = fileURLToPath(new URL('..', import.meta.url));
const LANGS = ['en', 'pt', 'es'];

function blocks(path) {
  const md = readFileSync(path, 'utf8');
  const out = [];
  const fence = /^```calc(?:[ \t]+(.*))?\n([\s\S]*?)\n```/gm;
  let match;
  while ((match = fence.exec(md)) !== null) {
    out.push({ code: match[2], line: md.slice(0, match.index).split('\n').length });
  }
  return out;
}

function sources() {
  const files = [];
  for (const lang of LANGS) {
    const docs = join(root, 'docs-src', 'src', lang);
    for (const name of readdirSync(docs).filter((file) => file.endsWith('.md'))) {
      files.push({ label: `docs/${lang}/${name}`, path: join(docs, name) });
    }
    files.push({
      label: `examples/${lang}`,
      path: join(root, 'js', 'i18n', 'src', `examples.${lang}.md`),
    });
  }
  return files;
}

test('the block extractor finds fenced calc blocks and their line', () => {
  const found = blocks(join(root, 'docs-src', 'src', 'en', 'numbers.md'));
  assert.ok(found.length > 5);
  assert.ok(found.every((block) => block.code.length > 0 && block.line > 0));
});

test('documentation and Examples blocks evaluate without errors', () => {
  const failing = [];
  let evaluated = 0;
  for (const { label, path } of sources()) {
    for (const { code, line } of blocks(path)) {
      evaluated++;
      const lines = code.split('\n');
      const { results } = createEngine({ rates: FIXTURE_RATES }).evaluateLines(lines);
      results.forEach((result, index) => {
        if (result && result.type === 'error') {
          failing.push(`${label}:${line} ${JSON.stringify(lines[index].trim().slice(0, 60))}`);
        }
      });
    }
  }
  // A broken extractor must not turn this into a test of nothing.
  assert.ok(evaluated > 400, `only ${evaluated} blocks were evaluated`);
  ratchet('docs-errors', failing);
});

// DOC-04: the budget Example adds its category totals to the rows they total, so
// the total bar shows 3,900 for a 1,950 budget. This is the number the page is
// trying to show. `todo` keeps it visible without failing the build.
test(
  'the household budget Example totals its budget once',
  { todo: 'DOC-04: the total bar counts the budget twice' },
  () => {
    const md = readFileSync(join(root, 'js', 'i18n', 'src', 'examples.en.md'), 'utf8');
    const start = md.indexOf('## Household budget by category');
    assert.notEqual(start, -1);
    const block = blocks(join(root, 'js', 'i18n', 'src', 'examples.en.md')).find(
      (entry) => entry.line > md.slice(0, start).split('\n').length
    );
    const { total } = createEngine({ rates: FIXTURE_RATES }).evaluateLines(block.code.split('\n'));
    assert.equal(formatResult(total), '1,950');
  }
);
