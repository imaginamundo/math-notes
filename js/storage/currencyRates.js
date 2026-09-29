// Currency rates: fetch the daily table and cache it. Kept in the storage layer
// and independent of any mathjs instance, so the main thread can fetch rates and
// forward them to the worker without loading the engine. Registering them as
// units lives in js/eval/currency.js.
import storage from '../util/storage.js';

const BASE = 'EUR';
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

function isFresh(data) {
  if (!data || !data.fetchedAt) return false;
  return new Date(data.fetchedAt).toDateString() === new Date().toDateString();
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
    notify('currency:updated', { source: 'cached', data: cached });
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
      notify('currency:updated', { source: 'live', data });
    })
    .catch(() => {
      // Keep working with yesterday's rates, but say they are stale.
      if (cached) notify('currency:updated', { source: 'stale', data: cached });
      else notify('currency:error');
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

export { BASE, STORAGE_KEY, loadCached, fetchRates, startRateRefresh };
