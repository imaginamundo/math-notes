// Shared deflate helpers for the share link and the snapshot store. The
// platform only sometimes exposes CompressionStream/DecompressionStream, so the
// text helpers return null when it is missing and callers fall back to storing
// the plain value.

const SUPPORTS_COMPRESSION =
  typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

function toBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // base64url, not base64, so `+ / =` never need percent-encoding in a URL.
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// Inflates while counting bytes, so an oversized payload is abandoned midway
// instead of being materialised first (the decoder may be fed by strangers).
async function inflate(bytes, maxBytes = Infinity) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  const reader = stream.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error('payload too large');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

// Compress a string to a base64url token, or null where unsupported/failed.
async function compressText(text) {
  if (!SUPPORTS_COMPRESSION) return null;
  try {
    return toBase64Url(await deflate(new TextEncoder().encode(text)));
  } catch {
    return null;
  }
}

// Inverse of compressText; null on any malformed input.
async function decompressText(token) {
  if (!SUPPORTS_COMPRESSION) return null;
  try {
    return new TextDecoder().decode(await inflate(fromBase64Url(token)));
  } catch {
    return null;
  }
}

export {
  SUPPORTS_COMPRESSION,
  toBase64Url,
  fromBase64Url,
  deflate,
  inflate,
  compressText,
  decompressText,
};
