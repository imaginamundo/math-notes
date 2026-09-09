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
  assert.equal(WorkerStub.latest.sent.length, 0);
});

test('a stale reply is not rendered', async () => {
  const { client, node, renders } = setup();
  const worker = WorkerStub.latest;
  worker.autoReply = false;
  const pending = client.update();
  // The sheet changed while the request was in flight.
  node.value = '1 + 2';
  worker.reply(worker.sent[0]);
  await pending;
  assert.equal(renders.length, 0, 'text moved on, so the reply must be dropped');
});

test('a crashed worker rejects in flight and falls back to the main thread', async () => {
  const originalError = console.error;
  console.error = () => {};
  const { client, renders, busy } = setup();
  const worker = WorkerStub.latest;
  worker.autoReply = false;
  const pending = client.update();
  worker.crash();
  await pending;

  await client.update();
  console.error = originalError;
  assert.equal(renders.length, 1, 'fallback path still renders');
  assert.equal(renders[0].data.total, 2, 'main-thread engine evaluated 1 + 1');
  assert.equal(busy[busy.length - 1], false, 'busy flag cleared after the crash');
});
