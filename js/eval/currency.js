import { BASE } from '../core/currencySymbols.js';

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
    try {
      math.createUnit(code, { definition: `${1 / perBase} ${BASE}` }, { override: true });
    } catch {
      // skip codes that cannot be registered
    }
  }
}

// Seed the engine with whatever rates the composition root hands it. Later
// updates are pushed in explicitly — the worker by a message, the main-thread
// fallback by evalClient — so the engine itself never subscribes to browser
// events or reads storage.
function initCurrency(math, rates) {
  ensureBaseUnit(math);
  if (rates) registerRates(math, rates);
}

export { registerRates };
export default initCurrency;
