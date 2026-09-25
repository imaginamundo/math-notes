import { test } from 'node:test';
import assert from 'node:assert/strict';

// A tiny Worker stand-in that records messages and can auto-answer or be
// crashed, so evalClient's scheduling/gating/fallback logic can be unit-tested
// instead of relying on browser e2e only.
class WorkerStub {
  static latest = null;
  constructor() {
    this.listeners = {};
    this.sent = [];
    this.autoReply = true;
    WorkerStub.latest = this;
  }
  addEventListener(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }
  postMessage(message) {
    this.sent.push(message);
    if (this.autoReply && message.type === 'evaluate') this.reply(message);
  }
  reply(message) {
    this.emit('message', {
      data: {
        id: message.id,
        type: 'result',
        results: [{ type: 'value', value: '4' }],
        total: 4,
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

globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({ base: 'EUR', rates: {} }),
});

const editableNode = () => ({ value: '1 + 1' });

const { createEvalClient } = await import('../js/evalClient.js');

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

test('update renders text, evaluates and clears the busy flag', async () => {
  const { client, textRender, renders, busy } = setup();
  await client.update();
  assert.deepEqual(textRender, [['1 + 1']]);
  assert.equal(WorkerStub.latest.sent.length, 1);
  assert.equal(WorkerStub.latest.sent[0].type, 'evaluate');
  assert.equal(renders.length, 1);
  assert.equal(renders[0].data.total, 4);
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

test('a crashed worker falls back to the main thread for the in-flight request', async () => {
  const { client, renders, busy } = setup();
  await client.update(); // creates the worker
  renders.length = 0;
  busy.length = 0;
  const worker = WorkerStub.latest;
  worker.autoReply = false;
  const pending = client.update();
  worker.crash();
  await pending;
  assert.equal(renders.length, 1, 'the in-flight request still renders via the fallback');
  assert.equal(renders[0].data.total, 2, 'main-thread engine evaluated 1 + 1');

  await client.update();
  assert.equal(renders.length, 2, 'later updates keep using the fallback');
  assert.equal(busy[busy.length - 1], false, 'busy flag cleared after the crash');
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
      data: { id, type: 'result', results: [], total: 4, startLine: -1 },
    });
  reply(id1);
  await r1;
  reply(id2);
  await r2;

  assert.equal(renders.length, 2);
  assert.equal(renders[0].data.startLine, -1, 'the pre-change reply is not forced');
  assert.equal(renders[1].data.startLine, 0, 'the post-change reply forces a full render');
});
