import { test } from 'node:test';
import assert from 'node:assert/strict';
import debounce from '../js/util/debounce.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('schedule runs once on the trailing edge, resetting on each call', async () => {
  let calls = 0;
  const d = debounce(() => calls++, 10);
  d.schedule();
  d.schedule();
  d.schedule();
  assert.equal(calls, 0, 'nothing runs before the delay');
  await wait(30);
  assert.equal(calls, 1);
});

test('flush runs a pending schedule and returns its value', () => {
  let calls = 0;
  const d = debounce(() => {
    calls++;
    return 'v';
  }, 1000);
  assert.equal(d.flush(), undefined, 'nothing pending');
  d.schedule();
  assert.equal(d.flush(), 'v');
  assert.equal(calls, 1);
  assert.equal(d.flush(), undefined, 'pending schedule consumed');
});

test('run always invokes now and clears a pending schedule', async () => {
  let calls = 0;
  const d = debounce(() => ++calls, 10);
  d.schedule();
  assert.equal(d.run(), 1);
  await wait(30);
  assert.equal(calls, 1, 'the pending schedule did not also fire');
});

test('cancel drops a pending schedule', async () => {
  let calls = 0;
  const d = debounce(() => calls++, 10);
  d.schedule();
  d.cancel();
  await wait(30);
  assert.equal(calls, 0);
});
