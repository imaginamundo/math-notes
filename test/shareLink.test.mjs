import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeSheet,
  decodeSheet,
  buildShareUrl,
  parseShareHash,
  MAX_DECODED_BYTES,
  LONG_URL_LENGTH,
} from '../js/share/shareLink.js';

const roundTrip = async (sheet) => decodeSheet(await encodeSheet(sheet));

test('encodeSheet/decodeSheet round-trip an ASCII sheet', async () => {
  const sheet = { name: 'Budget', content: 'rent = 1200\nfood = 380\nsum' };
  assert.deepEqual(await roundTrip(sheet), sheet);
});

test('encodeSheet/decodeSheet round-trip multi-byte UTF-8', async () => {
  const sheet = { name: 'Café 🧮 münü', content: '5 € to $\n# ação — ¥1000\n🍕 = 2' };
  assert.deepEqual(await roundTrip(sheet), sheet);
});

test('encodeSheet/decodeSheet round-trip an empty sheet', async () => {
  assert.deepEqual(await roundTrip({ name: '', content: '' }), { name: '', content: '' });
});

test('encodeSheet/decodeSheet round-trip a 100 KB sheet', async () => {
  const content = Array.from({ length: 8000 }, (_, i) => `line ${i} = ${i} * 2`).join('\n');
  assert.ok(content.length > 100 * 1000, 'fixture is at least 100 KB');
  const decoded = await roundTrip({ name: 'Big', content });
  assert.equal(decoded.content, content);
});

test('the token is a base64url payload behind a version tag', async () => {
  const token = await encodeSheet({ name: 'a', content: 'b' });
  assert.match(token, /^[01]\.[A-Za-z0-9\-_]+$/);
  // base64url only: none of these ever need percent-encoding in a URL.
  assert.equal(token.includes('+'), false);
  assert.equal(token.includes('/'), false);
  assert.equal(token.includes('='), false);
});

test('compression actually shrinks a repetitive sheet', async () => {
  const content = 'x = 1\n'.repeat(2000);
  const token = await encodeSheet({ name: 'Repeat', content });
  assert.ok(token.startsWith('1.'), 'expected the compressed version tag');
  assert.ok(token.length < content.length / 4, `token was ${token.length} chars`);
});

test('decodeSheet returns null for a truncated token', async () => {
  const token = await encodeSheet({ name: 'Budget', content: 'rent = 1200\nfood = 380' });
  assert.equal(await decodeSheet(token.slice(0, Math.floor(token.length / 2))), null);
});

test('decodeSheet returns null for an unknown version tag', async () => {
  const token = await encodeSheet({ name: 'a', content: 'b' });
  assert.equal(await decodeSheet(`9${token.slice(1)}`), null);
});

test('decodeSheet returns null when the payload is not valid JSON', async () => {
  // A well-formed version-0 (uncompressed) token whose bytes are not JSON.
  const bytes = new TextEncoder().encode('not json at all');
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const payload = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.equal(await decodeSheet(`0.${payload}`), null);
});

test('decodeSheet returns null for JSON that is not a sheet', async () => {
  const encode = (value) => {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return `0.${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
  };
  assert.equal(await decodeSheet(encode({ n: 'x' })), null, 'no content field');
  assert.equal(await decodeSheet(encode({ n: 'x', c: 42 })), null, 'content is not a string');
  assert.equal(await decodeSheet(encode([1, 2, 3])), null, 'not an object');
  assert.equal(await decodeSheet(encode(null)), null, 'null');
});

test('decodeSheet falls back to a name when only the content is present', async () => {
  const bytes = new TextEncoder().encode(JSON.stringify({ c: '1 + 1' }));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const payload = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.deepEqual(await decodeSheet(`0.${payload}`), {
    name: 'Shared sheet',
    content: '1 + 1',
  });
});

test('decodeSheet returns null for junk input instead of throwing', async () => {
  for (const junk of ['', '.', '1.', 'no-dot-here', '1.!!!!', null, undefined, 42, {}]) {
    assert.equal(await decodeSheet(junk), null, `junk: ${JSON.stringify(junk)}`);
  }
});

test('decodeSheet refuses a payload that inflates past the size cap', async () => {
  // A zip bomb: a tiny compressed token that inflates to well over the cap.
  const huge = new Uint8Array(MAX_DECODED_BYTES * 4);
  const stream = new Blob([huge]).stream().pipeThrough(new CompressionStream('deflate'));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = '';
  for (const byte of compressed) binary += String.fromCharCode(byte);
  const payload = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.ok(payload.length < 2000, 'the bomb really is small on the wire');
  assert.equal(await decodeSheet(`1.${payload}`), null);
});

test('buildShareUrl puts the token in the fragment, never the query string', async () => {
  const base = 'https://example.com/math-notes/';
  const { url, long } = await buildShareUrl(base, { name: 'Budget', content: '1 + 1' });
  assert.ok(url.startsWith(`${base}#s=`), url);
  assert.equal(url.includes('?'), false, 'a query string would reach the server logs');
  assert.equal(long, false);
});

test('buildShareUrl flags a link long enough for chat clients to truncate', async () => {
  const content = Array.from({ length: 3000 }, (_, i) => `${i} * ${i * 7 + 3}`).join('\n');
  const { url, long } = await buildShareUrl('https://example.com/math-notes/', {
    name: 'Long',
    content,
  });
  assert.ok(url.length > LONG_URL_LENGTH, `url was ${url.length} chars`);
  assert.equal(long, true);
});

test('a URL built by buildShareUrl decodes back through parseShareHash', async () => {
  const sheet = { name: 'Trip 🧳', content: '3 days + 4 hours in hours\nprev * 2' };
  const { url } = await buildShareUrl('https://example.com/math-notes/', sheet);
  const token = parseShareHash(new URL(url).hash);
  assert.deepEqual(await decodeSheet(token), sheet);
});

test('parseShareHash ignores hashes that carry no share token', () => {
  for (const hash of ['', '#', '#help-basics', '#other=1', null, undefined, 7]) {
    assert.equal(parseShareHash(hash), null, `hash: ${JSON.stringify(hash)}`);
  }
});
