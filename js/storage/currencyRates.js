// Currency rates: fetch the daily table and cache it. Kept in the storage layer
// and independent of any mathjs instance, so the main thread can fetch rates and
// forward them to the worker without loading the engine. Registering them as
// units lives in js/eval/currency.js.
import storage from '../util/storage.js';
import { CURRENCY_UPDATED, CURRENCY_ERROR } from '../util/events.js';
import { BASE } from '../core/currencySymbols.js';

const API_URL = 'https://api.frankfurter.dev/v1/latest?from=' + BASE;
const STORAGE_KEY = 'math-notes-currency-rates';
const FETCH_TIMEOUT = 10000;
// Re-check for a fresh day's rates while a window stays open (the API is daily).
const REFRESH_INTERVAL = 60 * 60 * 1000;

function loadCached() {
  try {
    const parsed = JSON.parse(storage.get(STORAGE_KEY) || 'null');
    return parsed && parsed.base && parsed.rates ? parsed : null;
  } catch {
    return null;
  }
}

function save(data) {
  storage.set(STORAGE_KEY, JSON.stringify({ ...data, fetchedAt: Date.now() }));
}

// A table is current for a little under the refresh interval, so the hourly re-check always
// asks again. It used to count as fresh for the whole local day of the fetch, which kept
// the previous business day's table until midnight for anyone who loaded the app before the
// day's rates were published.
const FRESH_FOR = REFRESH_INTERVAL - 5 * 60 * 1000;

function isFresh(data, now = Date.now()) {
  if (!data || !Number.isFinite(data.fetchedAt)) return false;
  const age = now - data.fetchedAt;
  return age >= 0 && age < FRESH_FOR;
}

function notify(name, detail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
}

// Fetch-and-notify. A fresh cache is used as-is; otherwise the network is tried
// with a timeout, and a stale cache kept working (with a `stale` notice) when
// the fetch fails.
function fetchRates() {
  const cached = loadCached();
  if (isFresh(cached)) {
    notify(CURRENCY_UPDATED, { source: 'cached', data: cached });
    return;
  }
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), FETCH_TIMEOUT) : null;
  fetch(API_URL, controller ? { signal: controller.signal } : undefined)
    .then((res) => {
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    })
    .then((data) => {
      save(data);
      notify(CURRENCY_UPDATED, { source: 'live', data });
    })
    .catch(() => {
      // Keep working with yesterday's rates, but say they are stale.
      if (cached) notify(CURRENCY_UPDATED, { source: 'stale', data: cached });
      else notify(CURRENCY_ERROR);
    })
    .finally(() => {
      if (timer) clearTimeout(timer);
    });
}

// A long-open window should pick up a new day's rates without a reload.
function startRateRefresh() {
  if (typeof window === 'undefined' || typeof setInterval !== 'function') return;
  setInterval(() => {
    if (!isFresh(loadCached())) fetchRates();
  }, REFRESH_INTERVAL);
}

export { STORAGE_KEY, loadCached, fetchRates, startRateRefresh, isFresh };
