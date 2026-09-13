import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTS_COMPRESSION, compressText, decompressText } from '../js/util/compress.js';

test('compressText round-trips through decompressText', async () => {
  if (!SUPPORTS_COMPRESSION) return;
  const text = 'the quick brown fox jumps over the lazy dog\n'.repeat(200);
  const token = await compressText(text);
  assert.equal(typeof token, 'string');
  assert.ok(token.length < text.length, 'the compressed token is smaller');
  assert.equal(await decompressText(token), text);
});

test('decompressText returns null for malformed input', async () => {
  if (!SUPPORTS_COMPRESSION) return;
  assert.equal(await decompressText('not-a-real-token'), null);
  assert.equal(await decompressText(''), null);
});
