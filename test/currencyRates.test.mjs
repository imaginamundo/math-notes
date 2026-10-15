import { test } from 'node:test';
import assert from 'node:assert/strict';

test('SEC-03: a cached table is fresh for under an hour, not for the whole day', async () => {
  const { isFresh } = await import('../js/storage/currencyRates.js');
  const now = Date.UTC(2026, 9, 14, 9, 0);
  assert.equal(isFresh({ fetchedAt: now - 10 * 60 * 1000 }, now), true);
  assert.equal(isFresh({ fetchedAt: now - 61 * 60 * 1000 }, now), false);
  assert.equal(isFresh({ fetchedAt: now - 8 * 3600 * 1000 }, now), false, 'same day, hours old');
  assert.equal(isFresh({}, now), false);
  assert.equal(isFresh(null, now), false);
});
