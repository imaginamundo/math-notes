import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// REVIEW.md PRE-01 (critical): constructors that take a size bypassed the
// 100-item cap, so one line (or an accepted share link) could ask mathjs for a
// matrix of 1.6 billion cells and crash the tab, which then crashed again on
// every load. These lines used to abort the process, so they run in a child with
// a small heap: a regression fails this test instead of killing the test runner.
const calculate = fileURLToPath(new URL('../js/core/calculate.js', import.meta.url));

function evaluateInChild(lines) {
  const script = `
    import { createEngine } from ${JSON.stringify(calculate)};
    const lines = JSON.parse(process.argv[1]);
    const out = lines.map((line) => {
      const { results } = createEngine().evaluateLines([line]);
      const r = results[0];
      return { type: r.type, value: r.type === 'error' ? String(r.value) : 'ok' };
    });
    console.log(JSON.stringify(out));
  `;
  return spawnSync(
    process.execPath,
    ['--max-old-space-size=192', '--input-type=module', '-e', script, JSON.stringify(lines)],
    { encoding: 'utf8', timeout: 60000 }
  );
}

// Evaluate whole sheets (each on a fresh engine) and report the last row of each.
function evaluateSheets(sheets) {
  const script = `
    import { createEngine } from ${JSON.stringify(calculate)};
    const out = JSON.parse(process.argv[1]).map((lines) => {
      const { results } = createEngine().evaluateLines(lines);
      const last = results[results.length - 1];
      return [last.type, String(last.value)];
    });
    console.log(JSON.stringify(out));
  `;
  return spawnSync(
    process.execPath,
    ['--max-old-space-size=192', '--input-type=module', '-e', script, JSON.stringify(sheets)],
    { encoding: 'utf8', timeout: 60000 }
  );
}

const MUST_BE_REFUSED = [
  'ones([40000, 40000])',
  'zeros([100000, 100000])',
  'ones(10000, 10000, "dense")',
  'ones(101, "dense")',
  'ones([200])',
  'ones(bignumber(200))',
  'identity(100000)',
  'identity(11)',
  'identity([300, 300])',
  'random([10000, 10000])',
  'randomInt([10000, 10000], 0, 5)',
  'resize([1], [1000000000])',
  'matrixFromFunction([10000, 10000], f(i) = 1)',
  'kron(ones(10), ones(11))',
  'diag(1:10, 100000)',
  'concat(1:100, 1:100, 1:100)',
  'sparse(1:200)',
  '1:bignumber(1000000000)',
  'range(1, bignumber(200))',
  'subset(zeros(5), index(1000000000), 1)',
  'setPowerset(1:60)',
  'setCartesian(1:50, 1:50)',
];

test('PRE-01: size-taking constructors refuse more than 100 items without allocating', () => {
  const run = evaluateInChild(MUST_BE_REFUSED);
  assert.equal(
    run.status,
    0,
    `the engine died (${run.signal || run.status}): ${run.stderr.slice(0, 200)}`
  );
  const results = JSON.parse(run.stdout);
  results.forEach((result, index) => {
    assert.equal(result.type, 'error', `${MUST_BE_REFUSED[index]} should be refused`);
    assert.match(result.value, /limited to \d+ items/, MUST_BE_REFUSED[index]);
  });
});

test('PRE-01: sizes held in variables, and growth by assignment, are refused too', () => {
  const sheets = [
    ['n = [40000, 40000]', 'ones(n)'],
    ['n = [1]', 'n[1000000000] = 1'],
    ['x = ones(10, 10)', 'x[1000, 1000] = 1'],
    ['x = 1:100', 'x[10000] = 1'],
  ];
  const run = evaluateSheets(sheets);
  assert.equal(run.status, 0, `the engine died (${run.signal || run.status})`);
  JSON.parse(run.stdout).forEach(([type, value], index) => {
    assert.equal(type, 'error', `${sheets[index].join(' / ')} should be refused`);
    assert.match(value, /limited to 100 items/);
  });
});

test('PRE-01: assignment inside the cap still grows a list', () => {
  const run = evaluateSheets([
    ['n = [1, 2, 3]', 'n[2] = 99'],
    ['n = [1, 2, 3]', 'n[5] = 7', 'n'],
  ]);
  assert.equal(run.status, 0);
  JSON.parse(run.stdout).forEach(([type]) => assert.notEqual(type, 'error'));
});

test('PRE-01: lists and matrices at or under the cap still work', () => {
  const lines = [
    'ones(10, 10)',
    'zeros(100)',
    'identity(10)',
    'sum(1:100)',
    'concat(1:50, 1:50)',
    'kron(ones(2), ones(5))',
    'range(1, 100)',
    'random([5, 5])',
    'size(ones(3, 4))',
    'resize([1, 2], [5])',
    'diag(1:9)',
    'setPowerset([1, 2, 3])',
  ];
  const run = evaluateInChild(lines);
  assert.equal(run.status, 0, `the engine died: ${run.stderr.slice(0, 200)}`);
  const results = JSON.parse(run.stdout);
  results.forEach((result, index) => {
    assert.equal(result.type, 'value', `${lines[index]} should work: ${result.value}`);
  });
});

// The wrappers replace functions that also have a parser version (inclusive range
// ends, 1-based indexes and dimensions). Wrapping must not change what they mean,
// so each line is compared with the same line on a bare, unguarded mathjs.
test('the size guards leave range, index and concat semantics unchanged', async () => {
  const { create, all } = await import('../js/lib/math.bundle.min.js');
  const { createEngine } = await import('../js/core/calculate.js');
  const bare = create(all);
  const lines = [
    'sum(1:100)',
    '1:5',
    '5:-1:1',
    '1:2:9',
    'range(1, 5)',
    'range(1, 5, 2)',
    'range(1, 5, 1, true)',
    'mean(1:5)',
    'subset([1, 2, 3], index(2))',
    'concat([1, 2], [3])',
    'concat([[1], [2]], [[3], [4]], 2)',
    'concat([[1], [2]], [[3], [4]], 1)',
    'size(zeros(3, 4))',
    'sum(ones(10, 10))',
    'identity(3)',
    'diag([1, 2, 3])',
    'kron([1, 2], [1, 1])',
    'resize([1, 2], [4], 7)',
  ];
  const engine = createEngine();
  lines.forEach((line) => {
    const result = engine.evaluateLines([line]).results[0];
    assert.equal(result.type, 'value', `${line} should evaluate`);
    assert.equal(bare.format(result.value), bare.format(bare.evaluate(line)), line);
  });
  const sheet = engine.evaluateLines(['n = [1, 2, 3]', 'n[2]', 'n[2] = 99', 'n[1:2]']).results;
  assert.equal(sheet[1].value, 2, 'a read index is still 1-based');
  assert.equal(bare.format(sheet[3].value), '[1, 99]');
});
