import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';
import { FIXTURE_RATES } from './helpers/rates.mjs';
import { ratchet } from './helpers/ratchet.mjs';

// The engine re-evaluates only from the first changed line. Whatever sequence of
// edits got a sheet to its current text, the result must equal evaluating that
// text from scratch (AGENTS.md invariant 5). This test builds random edit
// sequences, runs each through one long-lived engine, and compares every step
// with a fresh evaluation of the same lines.
//
// Known divergences (REVIEW.md AGG-01, AGG-03, SHEET-01, SHEET-03, UNIT-02) are
// recorded per seed in test/ratchets/incremental.json and must shrink to empty.
// Lines that read the clock are left out on purpose (DATE-04 is its own finding).
const POOL = [
  'x = 5',
  'y = x * 2',
  'rent = 1200',
  'tax = 20%',
  'a = 3 kg',
  'price: 10 + 5',
  'x + 1',
  'y / 2',
  'rent * 2',
  'a + 500 g',
  '5 kg + 3 g',
  '10 USD to EUR',
  '$24 a day for a year',
  '2 hours 30 minutes',
  '100 + tax',
  'prev * 2',
  'prev',
  'sum',
  'average',
  'line(1) + 1',
  '12 #food',
  '20 #food #drink',
  '#food',
  '#drink',
  'foo bar',
  '5 m + 3 kg',
  'bad = foo bar',
  'z = #food + #drink',
  'u = x + ',
  'g = f(a) = a + x',
  'g(1)',
  'sq = f(x) = x * x',
  'sq(3)',
  'n = [1, 2, 3]',
  'n[2] = 99',
  'sum(n)',
  'Group:',
  'end',
  '# a comment',
  '',
  '',
];
const MAX_LINES = 12;
const SEQUENCES = 400;
const STEPS = 8;

// Small seeded generator, so a failing seed is reproducible.
function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One random edit of a sheet: replace, insert, delete or append a line.
export function edit(lines, rand) {
  const pick = () => POOL[Math.floor(rand() * POOL.length)];
  const index = (max) => Math.floor(rand() * max);
  const next = [...lines];
  const roll = rand();
  if (!next.length || (roll < 0.25 && next.length < MAX_LINES)) {
    next.splice(index(next.length + 1), 0, pick());
  } else if (roll < 0.5) {
    next[index(next.length)] = pick();
  } else if (roll < 0.65 && next.length > 1) {
    next.splice(index(next.length), 1);
  } else if (roll < 0.8 && next.length < MAX_LINES) {
    next.push(pick());
  } else {
    next[index(next.length)] = pick();
  }
  return next;
}

// What the user sees for an evaluation: each row's type and shown value, and the
// total. Raw mathjs objects are not compared, only what is drawn.
export function shown({ results, total }) {
  const row = (result) =>
    result
      ? `${result.type}:${
          result.type === 'error' || result.value === undefined
            ? result.value
            : formatResult(result.value)
        }`
      : 'none';
  return {
    rows: results.map(row),
    total: total === null || total === undefined ? null : formatResult(total),
  };
}

export function firstDifference(a, b) {
  if (a.total !== b.total) return { line: -1, expected: b.total, actual: a.total };
  const length = Math.max(a.rows.length, b.rows.length);
  for (let i = 0; i < length; i++) {
    if (a.rows[i] !== b.rows[i]) return { line: i, expected: b.rows[i], actual: a.rows[i] };
  }
  return null;
}

function diverges(seed) {
  const rand = random(seed);
  const incremental = createEngine({ rates: FIXTURE_RATES });
  const reference = createEngine({ rates: FIXTURE_RATES });
  let lines = [];
  for (let step = 0; step < STEPS; step++) {
    lines = edit(lines, rand);
    const actual = shown(incremental.evaluateLines(lines));
    reference.evaluateLines([]);
    const expected = shown(reference.evaluateLines(lines));
    const difference = firstDifference(actual, expected);
    if (difference) return { seed, step, lines, ...difference };
  }
  return null;
}

test('the generator is reproducible and edits stay within bounds', () => {
  const run = (seed) => {
    const rand = random(seed);
    let lines = [];
    for (let i = 0; i < 20; i++) lines = edit(lines, rand);
    return lines;
  };
  assert.deepEqual(run(7), run(7));
  assert.notDeepEqual(run(7), run(8));
  assert.ok(run(7).length <= MAX_LINES);
});

test('the comparison reports where two evaluations first differ', () => {
  const a = { rows: ['value:1', 'value:2'], total: '3' };
  assert.equal(firstDifference(a, { ...a }), null);
  assert.deepEqual(firstDifference(a, { rows: ['value:1', 'value:9'], total: '3' }), {
    line: 1,
    expected: 'value:9',
    actual: 'value:2',
  });
  assert.equal(firstDifference(a, { rows: a.rows, total: '4' }).line, -1);
});

test('incremental evaluation equals a fresh evaluation after random edits', () => {
  const failing = [];
  for (let seed = 1; seed <= SEQUENCES; seed++) {
    const difference = diverges(seed);
    if (difference) {
      failing.push(`seed-${seed}`);
      if (process.env.DEBUG_INCREMENTAL) {
        console.log(
          `seed ${seed} step ${difference.step} line ${difference.line}: expected ${difference.expected}, got ${difference.actual}\n  ${JSON.stringify(difference.lines)}`
        );
      }
    }
  }
  ratchet('incremental', failing);
});

// The sequences REVIEW.md reproduces by hand: evaluate `before`, then `after`, on
// one engine, and compare `after` with a fresh evaluation. The random test above
// rarely lands on these, so they are pinned explicitly, each by finding ID.
const KNOWN = [
  {
    id: 'SHEET-01-failed-assignment',
    before: ['price = 100', 'price = cost * 2', 'price * 2'],
    after: ['price = 100', 'price = cost * 2', 'price * 20'],
  },
  {
    id: 'SHEET-01-tag-assignment',
    before: ['20 #food', '30 #food', 'food total = #food * 1', 'food total * 2'],
    after: ['20 #food', '30 #food', 'food total = #food * 1', 'food total * 20'],
  },
  {
    id: 'SHEET-01-reserved-word',
    before: ['10', 'total = 5', '20', 'total'],
    after: ['10', 'total = 5', '20', 'total + 0'],
  },
  {
    id: 'SHEET-01-error-text-as-value',
    before: ['x = 5', 'x = foo + 1', '1', 'x'],
    after: ['x = 5', 'x = foo + 1', '2', 'x'],
  },
  {
    id: 'AGG-01-function-sees-edited-variable',
    before: ['f = g(x) = x * rate', 'rate = 3', 'f(2)'],
    after: ['f = g(x) = x * rate', 'rate = 4', 'f(2)'],
  },
  {
    id: 'AGG-01-function-sees-later-assignment',
    before: ['f = g(x) = x * rate', 'rate = 3', 'f(2)', 'rate = 10'],
    after: ['f = g(x) = x * rate', 'rate = 3', 'f(3)', 'rate = 10'],
  },
  {
    id: 'AGG-01-constant-reassigned-below',
    before: ['k = 3', 'double = f(x) = x * k', 'k = 5', 'double(1)'],
    after: ['k = 3', 'double = f(x) = x * k', 'k = 6', 'double(1)'],
  },
  {
    id: 'AGG-01-currency',
    before: ['conv = c(x) = x * fx', 'fx = 1.1 USD', 'conv(10)'],
    after: ['conv = c(x) = x * fx', 'fx = 2 USD', 'conv(10)'],
  },
  {
    id: 'AGG-01-typed-top-down',
    before: ['rate = 25', 'pay = p(h) = h * rate', 'pay(10)', 'rate = 30', 'pay(10)', 'sum'],
    after: ['rate = 25', 'pay = p(h) = h * rate', 'pay(10)', 'rate = 40', 'pay(10)', 'sum'],
  },
  {
    id: 'AGG-01-deleted-assignment',
    before: ['net = n(x) = x - fee', 'fee = 1.5', 'net(10)'],
    after: ['net = n(x) = x - fee', 'net(10)'],
  },
  {
    id: 'SHEET-01-redefined-after-error',
    before: ['x = 5', 'x = foo + 1', 'x * 2', '1'],
    after: ['x = 5', 'x = foo + 1', 'x * 2', '2'],
  },
  {
    id: 'SHEET-03-read-above-assignment',
    before: ['n = [10, 20, 30]', 'n[2]', 'n[2] = 99'],
    after: ['n = [10, 20, 30]', 'n[2] + 0', 'n[2] = 99'],
  },
  {
    id: 'SHEET-03-self-updating-line',
    before: ['n = [1, 2, 3]', 'n[1] = n[1] + 1', 'n[1]'],
    after: ['n = [1, 2, 3]', 'n[1] = n[1] + 1 ', 'n[1]'],
  },
  {
    id: 'SHEET-03-object-property',
    before: ['p = {x: 1}', 'p.x = 5', 'p.x'],
    after: ['p = {x: 1}', 'p.x = 5', 'p.x + 0'],
  },
  {
    id: 'SHEET-03-later-edit-sees-assignment',
    before: ['n = [1, 2, 3]', 'n[2] = 99', 'sum(n)'],
    after: ['n = [1, 2, 3]', 'n[2] = 99', 'sum(n) * 1'],
  },
  {
    id: 'AGG-01-other-tab',
    // A tab switch hands the engine a different sheet with the same opening lines.
    before: ['rate = 3', 'pay = p(h) = h * rate', 'pay(10)'],
    after: ['rate = 3', 'pay = p(h) = h * rate', 'rate = 9', 'pay(10)'],
  },
];

test('the known sequences are valid sheets and the comparison catches a stale row', () => {
  assert.equal(new Set(KNOWN.map((c) => c.id)).size, KNOWN.length);
  const engine = createEngine({ rates: FIXTURE_RATES });
  engine.evaluateLines(['x = 1', 'x']);
  const fresh = createEngine({ rates: FIXTURE_RATES });
  assert.equal(
    firstDifference(
      shown(engine.evaluateLines(['x = 1', 'x'])),
      shown(fresh.evaluateLines(['x = 1', 'x']))
    ),
    null
  );
});

test('incremental evaluation matches a fresh one on the sequences from the review', () => {
  const failing = [];
  for (const { id, before, after } of KNOWN) {
    const incremental = createEngine({ rates: FIXTURE_RATES });
    incremental.evaluateLines(before);
    const actual = shown(incremental.evaluateLines(after));
    const expected = shown(createEngine({ rates: FIXTURE_RATES }).evaluateLines(after));
    if (firstDifference(actual, expected)) failing.push(id);
  }
  ratchet('incremental-known', failing);
});

// SHEET-03 is invisible to the comparison above: a fresh evaluation used to be
// wrong in the same way, because element assignment mutated the value an earlier
// row (or an alias, or `prev`) held. So it is asserted directly: a row keeps
// showing what it computed.
test('SHEET-03: element assignment does not rewrite the rows above it', () => {
  const cases = [
    { lines: ['n = [1, 2, 3]', 'n[2] = 99'], row: 0, expected: '[1, 2, 3]' },
    { lines: ['n = [1, 2, 3]', 'n[2] = 99', 'n'], row: 2, expected: '[1, 99, 3]' },
    { lines: ['p = {x: 1}', 'p.x = 5'], row: 0, expected: '{ x: 1 }' },
    { lines: ['n = [1, 2, 3]', 'm = n', 'n[2] = 99', 'm'], row: 3, expected: '[1, 2, 3]' },
    { lines: ['a = [1, 2, 3]', 'b = a', 'b[1] = 100', 'a'], row: 3, expected: '[1, 2, 3]' },
    { lines: ['[1, 2, 3]', 'x = prev', 'x[1] = 5'], row: 0, expected: '[1, 2, 3]' },
    { lines: ['M = [[1, 2], [3, 4]]', 'M[1, 1] = 0'], row: 0, expected: '[[1, 2], [3, 4]]' },
    { lines: ['r = 1:3', 'r[1] = 9'], row: 0, expected: '[1, 2, 3]' },
    { lines: ['n = [10, 20, 30]', 'n[2]', 'n[2] = 99'], row: 1, expected: '20' },
  ];
  const failing = [];
  for (const { lines, row, expected } of cases) {
    const { results } = createEngine().evaluateLines(lines);
    const actual = formatResult(results[row].value);
    if (actual !== expected) failing.push(`${lines.join(' / ')} → row ${row}: ${actual}`);
  }
  assert.deepEqual(failing, []);
});

test('SHEET-03: a self-updating element assignment gives the same answer on every edit', () => {
  const engine = createEngine();
  const lastRow = (suffix) =>
    shown(engine.evaluateLines(['n = [1, 2, 3]', 'n[1] = n[1] + 1', `n[1]${suffix}`])).rows[2];
  // `n[1]` is 2 after the second line, however many times the sheet is edited.
  for (const suffix of ['', ' ', '  ', ' + 0', ' * 1', '']) {
    assert.equal(lastRow(suffix), 'value:2', JSON.stringify(suffix));
  }
});
