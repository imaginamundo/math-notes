// Encodes a sheet into a URL fragment so it can be pasted anywhere. No server,
// no storage, no database.
//
// The sheet goes in `location.hash`, never in a query string: a fragment is
// not sent to the server, never lands in GitHub Pages access logs, and is not
// forwarded in the `Referer` header. Someone's salary maths should not end up
// in a log file. It also keeps the service worker's cache keys unchanged,
// since the fragment is not part of the request URL.
//
// Wire format: `s=<version>.<base64url>`
//   version 1 — deflate-compressed JSON  (the normal path)
//   version 0 — plain JSON               (fallback where CompressionStream is missing)
//
// The version tag lets a future format change be rejected cleanly instead of
// decoding to garbage. `deflate` is used rather than `deflate-raw` for
// portability; it costs about six bytes.
//
// SECURITY: decoded content is only ever assigned to `textarea.value` by the
// caller — never to `innerHTML` — so a hostile payload is inert text. Every
// failure path here returns `null` rather than throwing.

import {
  SUPPORTS_COMPRESSION,
  toBase64Url,
  fromBase64Url,
  deflate,
  inflate,
} from '../util/compress.js';

const HASH_KEY = 's';
const VERSION_COMPRESSED = '1';
const VERSION_PLAIN = '0';

// The decoder is fed by strangers, so cap what a payload may inflate to. A
// human-written sheet is orders of magnitude below this; the cap exists to
// stop a zip bomb, not to limit real use.
const MAX_DECODED_BYTES = 256 * 1024;

// Past this, some chat clients truncate the link. We still build it — we just
// tell the user.
const LONG_URL_LENGTH = 8000;

/**
 * Encode a sheet into a token. Returns `null` if it cannot be encoded.
 * @param {{ name: string, content: string }} sheet
 * @returns {Promise<string|null>}
 */
async function encodeSheet(sheet) {
  try {
    const json = JSON.stringify({ n: String(sheet.name ?? ''), c: String(sheet.content ?? '') });
    const bytes = new TextEncoder().encode(json);
    if (!SUPPORTS_COMPRESSION) return `${VERSION_PLAIN}.${toBase64Url(bytes)}`;
    return `${VERSION_COMPRESSED}.${toBase64Url(await deflate(bytes))}`;
  } catch {
    return null;
  }
}

/**
 * Decode a token back into a sheet. Returns `null` for anything malformed:
 * a truncated token, an unknown version, a payload that does not inflate, one
 * that inflates past the size cap, or one whose JSON is not a sheet.
 * @param {string} token
 * @returns {Promise<{ name: string, content: string }|null>}
 */
async function decodeSheet(token) {
  try {
    if (typeof token !== 'string') return null;
    const separator = token.indexOf('.');
    if (separator === -1) return null;
    const version = token.slice(0, separator);
    const payload = token.slice(separator + 1);
    if (!payload) return null;

    let bytes = fromBase64Url(payload);
    if (version === VERSION_COMPRESSED) {
      if (!SUPPORTS_COMPRESSION) return null;
      bytes = await inflate(bytes, MAX_DECODED_BYTES);
    } else if (version === VERSION_PLAIN) {
      if (bytes.length > MAX_DECODED_BYTES) return null;
    } else {
      return null;
    }

    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.c !== 'string') return null;
    return { name: typeof parsed.n === 'string' ? parsed.n : 'Shared sheet', content: parsed.c };
  } catch {
    return null;
  }
}

/**
 * Build the full shareable URL for a sheet.
 * @param {string} base  Origin + pathname, without hash or query.
 * @param {{ name: string, content: string }} sheet
 * @returns {Promise<{ url: string, long: boolean }|null>}
 */
async function buildShareUrl(base, sheet) {
  const token = await encodeSheet(sheet);
  if (token === null) return null;
  const url = `${base}#${HASH_KEY}=${token}`;
  return { url, long: url.length > LONG_URL_LENGTH };
}

/**
 * Pull the share token out of a `location.hash`. Returns `null` when the hash
 * carries no share token (an in-page anchor, an empty hash, anything else).
 * @param {string} hash
 * @returns {string|null}
 */
function parseShareHash(hash) {
  if (typeof hash !== 'string') return null;
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const token = params.get(HASH_KEY);
  return token || null;
}

export { encodeSheet, decodeSheet, buildShareUrl, parseShareHash };
export { HASH_KEY, MAX_DECODED_BYTES, LONG_URL_LENGTH };
