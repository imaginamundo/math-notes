import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/core/calculate.js';
import { FIXTURE_RATES } from './helpers/rates.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// A user should never read mathjs internals: typed-function signatures, "function
// mod", the app's own `__helper` names, or a dump of a Unit or matrix object
// (REVIEW.md ERR-01…07, MIX-19, MIX-22). This sweeps value kinds against
// operators and functions and checks the *wording* of every error.
//
// The sweep is large and not yet clean, so it is a count ratchet: the number of
// leaking inputs may only go down, and every leak *category* must already be in
// the baseline. Accept a change on purpose with UPDATE_RATCHET=1.
const engine = createEngine({ rates: FIXTURE_RATES });
const run = (line) => engine.evaluateLines([line]).results[0];

const KINDS = [
  '5',
  '-5',
  '0.5',
  '5 m',
  '5 kg',
  '5 USD',
  '$5',
  '2 hours',
  '90 minutes',
  '20 degC',
  'today',
  '10:30',
  '"text"',
  'true',
  '[1, 2, 3]',
  '(1:3)',
  '2024-01-31',
];
const OPERATORS = ['+', '-', '*', '/', '^', 'to', 'in', 'and', 'at', 'for', 'of'];
const FUNCTIONS = ['sin', 'log', 'sqrt', 'round', 'abs', 'mean', 'max', 'std', 'sum', 'floor'];

// What counts as a leak: wording that only makes sense inside mathjs.
const LEAK = new RegExp(
  [
    'Unexpected type of argument',
    'Too (many|few) arguments',
    'Cannot calculate .*unexpected type',
    'typed-function',
    '__[A-Za-z]+',
    '\\[object',
    'DenseMatrix',
    'calendarInterval',
    '\\(type: ',
    'signatures?',
    '\\bfunction [A-Za-z]+\\b',
  ].join('|'),
  'i'
);

// Collapse a message to its shape, so categories are few and stable.
function category(message) {
  const found = LEAK.exec(message);
  return found ? found[0].toLowerCase().replace(/\d+/g, 'N') : null;
}

function inputs() {
  const lines = [];
  for (const left of KINDS) {
    for (const op of OPERATORS) {
      for (const right of KINDS) lines.push(`${left} ${op} ${right}`);
    }
  }
  for (const fn of FUNCTIONS) for (const arg of KINDS) lines.push(`${fn}(${arg})`);
  return lines;
}

test('the leak detector flags mathjs wording and passes the app’s own', () => {
  assert.ok(category('Unexpected type of argument in function mod (expected: number)'));
  assert.ok(category('Cannot calculate mean, unexpected type of argument (type: Unit)'));
  assert.ok(category('undefined symbol __var_x'));
  assert.equal(category('Cannot combine "kg" and "m" — that unit has no meaning'), null);
  assert.equal(category('Undefined symbol foo'), null);
});

test('errors on mixed value kinds do not leak mathjs internals', () => {
  const leaks = [];
  const categories = new Map();
  for (const line of inputs()) {
    const result = run(line);
    if (result.type !== 'error') continue;
    const found = category(String(result.value));
    if (!found) continue;
    leaks.push(line);
    if (!categories.has(found)) categories.set(found, line);
  }

  const summary = {
    total: leaks.length,
    categories: [...categories.keys()].sort(),
  };
  const file = join(fileURLToPath(new URL('./ratchets/', import.meta.url)), 'errorLeaks.json');
  if (process.env.UPDATE_RATCHET) {
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, `${JSON.stringify(summary, null, 2)}\n`);
    return;
  }
  const known = existsSync(file)
    ? JSON.parse(readFileSync(file, 'utf8'))
    : { total: 0, categories: [] };
  const newCategories = summary.categories.filter((c) => !known.categories.includes(c));
  assert.deepEqual(newCategories, [], 'a new kind of leaked mathjs message appeared');
  assert.ok(
    summary.total <= known.total,
    `${summary.total} inputs leak, up from ${known.total}. Fix them, or accept with UPDATE_RATCHET=1.`
  );
  assert.ok(
    summary.total >= known.total,
    `Only ${summary.total} inputs leak now (baseline ${known.total}). Run UPDATE_RATCHET=1 npm test to lower it.`
  );
});
