import { registerCurrencyCode } from '../core/currencySymbols.js';
import { BASE, loadCached } from '../storage/currencyRates.js';

function ensureBaseUnit(math) {
  try {
    math.createUnit(BASE);
  } catch {
    // base unit already exists
  }
}

function registerRates(math, data) {
  if (!math.createUnit || !data || data.base !== BASE || !data.rates) return;
  ensureBaseUnit(math);
  for (const [code, perBase] of Object.entries(data.rates)) {
    // A missing or non-positive rate would register an Infinity unit, so skip it.
    if (!Number.isFinite(perBase) || perBase <= 0) continue;
    if (code.toUpperCase() === BASE) continue;
    registerCurrencyCode(code);
    try {
      math.createUnit(code, { definition: `${1 / perBase} ${BASE}` }, { override: true });
    } catch {
      // skip codes that cannot be registered
    }
  }
}

// Seed the engine with the cached rates. Later updates are pushed in explicitly
// — the worker by a message, the main-thread fallback by evalClient — so the
// engine itself never subscribes to browser events.
function initCurrency(math) {
  ensureBaseUnit(math);
  const cached = loadCached();
  if (cached) registerRates(math, cached);
}

export { registerRates };
export default initCurrency;
