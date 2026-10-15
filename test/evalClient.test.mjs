import { test } from 'node:test';
import assert from 'node:assert/strict';

// A tiny Worker stand-in that records messages and can auto-answer or be
// crashed, so evalClient's scheduling/gating/fallback logic can be unit-tested
// instead of relying on browser e2e only.
class WorkerStub {
  static latest = null;
  static defaultAutoReply = true;
  constructor() {
    this.listeners = {};
    this.sent = [];
    this.autoReply = WorkerStub.defaultAutoReply;
    WorkerStub.latest = this;
  }
  addEventListener(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }
  postMessage(message) {
    if (this.throwOnEvaluate && message.type === 'evaluate') {
      this.throwOnEvaluate = false;
      throw new Error('postMessage failed');
    }
    this.sent.push(message);
    if (this.autoReply && message.type === 'evaluate') this.reply(message);
  }
  reply(message) {
    this.emit('message', {
      data: {
        id: message.id,
        type: 'result',
        results: [{ type: 'value', value: '4' }],
        total: '4',
        startLine: 0,
      },
    });
  }
  emit(type, event) {
    (this.listeners[type] || []).forEach((fn) => fn(event));
  }
  crash() {
    this.emit('error', new Error('boom'));
  }
  terminate() {
    if (WorkerStub.latest === this) WorkerStub.latest = null;
  }
}

const editableNode = () => ({ value: '1 + 1' });

const { createEvalClient, recoveryFor } = await import('../js/evalClient.js');

function setup() {
  globalThis.Worker = WorkerStub;
  WorkerStub.latest = null;
  const node = editableNode();
  const textRender = [];
  const renders = [];
  const busy = [];
  const client = createEvalClient(
    node,
    (lines) => textRender.push(lines),
    (lines, data) => renders.push({ lines, data }),
    (state) => busy.push(state)
  );
  return { client, node, textRender, renders, busy };
}

test('creating a client does not touch the network', () => {
  let fetched = 0;
  globalThis.fetch = async () => {
    fetched += 1;
    return { ok: true, json: async () => ({ base: 'EUR', rates: {} }) };
  };
  try {
    setup();
    assert.equal(fetched, 0, 'rate fetching belongs to the composition root');
  } finally {
    delete globalThis.fetch;
  }
});

test('update renders text, evaluates and clears the busy flag', async () => {
  const { client, textRender, renders, busy } = setup();
  await client.update();
  assert.deepEqual(textRender, [['1 + 1']]);
  assert.equal(WorkerStub.latest.sent.length, 1);
  assert.equal(WorkerStub.latest.sent[0].type, 'evaluate');
  assert.equal(renders.length, 1);
  assert.equal(renders[0].data.total, '4');
  assert.deepEqual(busy, [true, false]);
});

test('schedule then flush evaluates once on the trailing edge', async () => {
  const { client, renders } = setup();
  client.schedule();
  client.schedule();
  await client.flush();
  assert.equal(renders.length, 1);
  assert.equal(WorkerStub.latest.sent.length, 1);
});

test('flush with nothing scheduled is a no-op', async () => {
  const { client, renders } = setup();
  await client.flush();
  assert.equal(renders.length, 0);
  assert.equal(WorkerStub.latest, null, 'the worker is created lazily');
});

test('only the changed suffix is sent after the first evaluation', async () => {
  const { client, node } = setup();
  node.value = 'a\nb\nc';
  await client.update();
  const worker = WorkerStub.latest;
  assert.deepEqual(worker.sent[0].lines, ['a', 'b', 'c'], 'the first message is the whole sheet');
  assert.equal(worker.sent[0].from, 0);

  node.value = 'a\nb\nc2';
  await client.update();
  assert.deepEqual(worker.sent[1].lines, ['c2'], 'only the changed tail is sent');
  assert.equal(worker.sent[1].from, 2);

  // An unchanged sheet sends no lines; the worker rebuilds the same list.
  await client.update();
  assert.deepEqual(worker.sent[2].lines, []);
  assert.equal(worker.sent[2].from, 3);
});

test('a stale reply is not rendered', async () => {
  const { client, node, renders } = setup();
  await client.update(); // creates the worker
  const worker = WorkerStub.latest;
  renders.length = 0;
  worker.autoReply = false;
  const pending = client.update();
  // The sheet changed while the request was in flight.
  node.value = '1 + 2';
  worker.reply(worker.sent[worker.sent.length - 1]);
  await pending;
  assert.equal(renders.length, 0, 'text moved on, so the reply must be dropped');
});

test('a failed worker restart retries instead of falling back permanently', async () => {
  const { client, node, renders } = setup();
  await client.update(); // creates worker #1
  const first = WorkerStub.latest;
  first.autoReply = false;
  first.throwOnEvaluate = true;
  renders.length = 0;

  node.value = '2 + 2';
  await client.update();
  assert.notEqual(WorkerStub.latest, first, 'a fresh worker replaces the failed one');
  assert.equal(renders.length, 1, 'the retried request still renders on the worker');
  assert.equal(renders[0].data.total, '4');

  // Later updates keep using the worker path.
  await client.update();
  assert.equal(renders.length, 2);
});

// The timeout path cannot be exercised without waiting out the real timeout
// twice, so the policy itself is what gets tested: a timeout must never turn
// into a synchronous main-thread evaluation, which would freeze typing for at
// least as long as the worker already needed.
test('a timeout restarts the worker instead of evaluating on the main thread', () => {
  assert.equal(recoveryFor({ workerUnavailable: false, retried: false }), 'restart');
  assert.equal(recoveryFor({ workerUnavailable: false, retried: true }), 'fail');
});

test('a crashed or unloadable worker is the only main-thread fallback', () => {
  assert.equal(recoveryFor({ workerUnavailable: true, retried: false }), 'fallback');
  assert.equal(recoveryFor({ workerUnavailable: true, retried: true }), 'fallback');
});

test('a crashed worker is started again once, then the main thread takes over', async () => {
  const { client, renders, busy } = setup();
  await client.update(); // creates the worker
  renders.length = 0;
  const first = WorkerStub.latest;
  first.autoReply = false;
  const pending = client.update();
  first.crash();
  await pending;
  assert.notEqual(WorkerStub.latest, first, 'one crash restarts the worker');
  assert.equal(renders.length, 1, 'the in-flight request is evaluated by the new worker');

  const second = WorkerStub.latest;
  second.autoReply = false;
  const pendingAgain = client.update();
  second.crash();
  await pendingAgain;
  assert.equal(renders[renders.length - 1].data.total, 2, 'main-thread engine evaluated 1 + 1');

  const before = renders.length;
  await client.update();
  assert.equal(renders.length, before + 1, 'later updates keep using the fallback');
  assert.equal(busy[busy.length - 1], false, 'busy flag cleared after the crash');
});

test('a dropped forced redraw is re-armed for the next request', async () => {
  const { client, node, renders } = setup();
  await client.update(); // creates the worker
  const worker = WorkerStub.latest;
  worker.autoReply = false;
  renders.length = 0;
  const evaluateIds = () => worker.sent.filter((m) => m.type === 'evaluate').map((m) => m.id);
  const reply = (id) =>
    worker.emit('message', {
      data: { id, type: 'result', results: [], total: '4', startLine: -1 },
    });

  client.syncPrecision(5);
  const r1 = client.update();
  const id1 = evaluateIds().at(-1);
  node.value = '1 + 2'; // supersede the forced request
  reply(id1);
  await r1;
  assert.equal(renders.length, 0, 'the superseded forced reply is dropped');

  const r2 = client.update();
  const id2 = evaluateIds().at(-1);
  reply(id2);
  await r2;
  assert.equal(renders.length, 1);
  assert.equal(renders[0].data.startLine, 0, 'the re-armed force repaints fully');
});

test('a stale reply does not consume a pending precision force', async () => {
  const { client, renders } = setup();
  await client.update(); // creates the worker
  const worker = WorkerStub.latest;
  worker.autoReply = false;
  renders.length = 0;

  const evaluateIds = () => worker.sent.filter((m) => m.type === 'evaluate').map((m) => m.id);

  const r1 = client.update();
  const id1 = evaluateIds().at(-1);
  client.syncPrecision(5);
  const r2 = client.update();
  const id2 = evaluateIds().at(-1);
  assert.notEqual(id1, id2);

  const reply = (id) =>
    worker.emit('message', {
      data: { id, type: 'result', results: [], total: '4', startLine: -1 },
    });
  reply(id1);
  await r1;
  reply(id2);
  await r2;

  assert.equal(renders.length, 2);
  assert.equal(renders[0].data.startLine, -1, 'the pre-change reply is not forced');
  assert.equal(renders[1].data.startLine, 0, 'the post-change reply forces a full render');
});

// REVIEW.md CORE-01: a reply dropped because the sheet moved on still told the
// worker's cache how far the sheet had changed, so the next reply, which only
// covers the edit since, must not hide that: rows above it may need repainting.
test('CORE-01: a dropped reply’s startLine is not lost to the next render', async () => {
  const { client, node, renders } = setup();
  await client.update(); // creates the worker
  const worker = WorkerStub.latest;
  worker.autoReply = false;
  renders.length = 0;
  const lastId = () => worker.sent.filter((m) => m.type === 'evaluate').at(-1).id;
  const reply = (id, startLine) =>
    worker.emit('message', { data: { id, type: 'result', results: [], total: '4', startLine } });

  const dropped = client.update();
  const id1 = lastId();
  node.value = '1 + 2'; // supersede it
  reply(id1, 0); // the engine changed everything from line 0
  await dropped;
  assert.equal(renders.length, 0);

  const next = client.update();
  reply(lastId(), 4); // the edit since only changed from line 4
  await next;
  assert.equal(renders.length, 1);
  assert.equal(renders[0].data.startLine, 0, 'the earlier, wider change is still repainted');
});

test('CORE-01: a dropped reply that changed nothing does not widen the next render', async () => {
  const { client, node, renders } = setup();
  await client.update();
  const worker = WorkerStub.latest;
  worker.autoReply = false;
  renders.length = 0;
  const lastId = () => worker.sent.filter((m) => m.type === 'evaluate').at(-1).id;
  const reply = (id, startLine) =>
    worker.emit('message', { data: { id, type: 'result', results: [], total: '4', startLine } });

  const dropped = client.update();
  const id1 = lastId();
  node.value = '1 + 2';
  reply(id1, -1);
  await dropped;
  const next = client.update();
  reply(lastId(), 3);
  await next;
  assert.equal(renders[0].data.startLine, 3);
});

test('CORE-01: the widened start line is used once, then cleared', async () => {
  const { client, node, renders } = setup();
  await client.update();
  const worker = WorkerStub.latest;
  worker.autoReply = false;
  renders.length = 0;
  const lastId = () => worker.sent.filter((m) => m.type === 'evaluate').at(-1).id;
  const reply = (id, startLine) =>
    worker.emit('message', { data: { id, type: 'result', results: [], total: '4', startLine } });
  const dropped = client.update();
  node.value = '1 + 2';
  reply(lastId(), 1);
  await dropped;
  const second = client.update();
  reply(lastId(), 5);
  await second;
  node.value = '1 + 3';
  const third = client.update();
  reply(lastId(), 5);
  await third;
  assert.deepEqual(
    renders.map((r) => r.data.startLine),
    [1, 5]
  );
});

// REVIEW.md CORE-05: a restarted worker (and the main-thread fallback) took its
// settings and rates from localStorage, not from what this window had last been
// told, so a restart could silently change results.
const sentSettings = (worker) =>
  worker.sent.filter((m) => m.type === 'setting').map((m) => [m.name, m.value]);

test('CORE-05: a restarted worker is seeded with this window’s settings and rates', async () => {
  const { client, node } = setup();
  await client.update(); // worker #1
  const first = WorkerStub.latest;
  client.syncMeasurement('us');
  client.syncPrecision(4);
  client.syncRates({ base: 'EUR', rates: { USD: 2 } });
  first.autoReply = false;
  first.throwOnEvaluate = true; // forces a restart
  node.value = '2 + 2';
  await client.update();
  const fresh = WorkerStub.latest;
  assert.notEqual(fresh, first);
  const seeded = Object.fromEntries(sentSettings(fresh));
  assert.equal(seeded.measurement, 'us');
  assert.equal(seeded.precision, 4);
  assert.deepEqual(seeded.rates, { base: 'EUR', rates: { USD: 2 } });
});

test('CORE-05: the main-thread fallback gets the settings it was sent before it loaded', async () => {
  const { client, node, renders } = setup();
  await client.update();
  const worker = WorkerStub.latest;
  client.syncMeasurement('us');
  worker.autoReply = false;
  node.value = '1 cup to ml';
  const pending = client.update();
  // The first crash restarts the worker; a second one gives up on it.
  WorkerStub.defaultAutoReply = false;
  worker.crash();
  await new Promise((resolve) => setTimeout(resolve, 0));
  WorkerStub.latest.crash();
  WorkerStub.defaultAutoReply = true;
  await pending;
  const value = renders.at(-1).data.results[0].value;
  const ml = value.toNumber('ml');
  assert.ok(Math.abs(ml - 236.588) < 0.01, `a US cup is 236.6 ml, got ${ml}`);
});
