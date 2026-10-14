import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

// A ratchet is a checked-in baseline of known failures for a test that sweeps
// many inputs. It lets a sweep land before every bug it finds is fixed, without
// going quiet about new ones:
//
//   - a failure that is not in the baseline fails the test (a regression);
//   - a baseline entry that no longer fails also fails the test, so the file
//     shrinks as findings are fixed and cannot rot into a list of the dead.
//
// Accept a change on purpose with `UPDATE_RATCHET=1 npm test`; the diff of
// test/ratchets/*.json is then the thing to review.
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'ratchets');

function path(name) {
  return join(dir, `${name}.json`);
}

function readBaseline(name) {
  return existsSync(path(name)) ? JSON.parse(readFileSync(path(name), 'utf8')) : [];
}

function writeBaseline(name, entries) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(path(name), `${JSON.stringify(entries, null, 2)}\n`);
}

// `current` is the list of failing keys this run found. Each key should name the
// input and, in brackets, the REVIEW.md finding that explains it.
export function ratchet(name, current) {
  const now = [...new Set(current)].sort();
  if (process.env.UPDATE_RATCHET) {
    writeBaseline(name, now);
    return;
  }
  const known = new Set(readBaseline(name));
  const added = now.filter((key) => !known.has(key));
  const fixed = [...known].filter((key) => !now.includes(key)).sort();
  assert.deepEqual(
    added,
    [],
    `${added.length} new failure(s) not in test/ratchets/${name}.json. Fix them, or accept with UPDATE_RATCHET=1.`
  );
  assert.deepEqual(
    fixed,
    [],
    `${fixed.length} baseline entr(ies) now pass. Run UPDATE_RATCHET=1 npm test to shrink test/ratchets/${name}.json.`
  );
}
