import preprocess from './preprocess.js';
import { unmangleName } from './multiWordVariables.js';
import { IDENTIFIER_SRC, WORD } from './identifiers.js';
import { describe, scrub } from './errorCatalogue.js';
import { isCurrencyCode } from './currencySymbols.js';

// The identifier after `to`/`in`/`as` when it names a scope variable rather
// than a Unit, so a conversion error can point at the shadowing variable.
function conversionTarget(code, scope) {
  const match = /(?:^|\s)(?:to|in|as)\s+([A-Za-z_]\w*)\s*$/i.exec(code.trim());
  if (!match) return null;
  const name = match[1];
  let value;
  try {
    value = scope[name];
  } catch {
    return null; // a name whose assignment failed raises when read
  }
  if (value === undefined || value === null) return null;
  if (typeof value === 'object' && value.isUnit === true) return null;
  return name;
}

// Turn mathjs's terse "Undefined symbol x" into a phrase-level message when
// the unknown symbol is part of a multi-word name (`monthly rent`) or a
// mangled forward reference (`__var_monthly_rent`). Single unknowns keep the
// original message.
function friendlyError(math, error, code, scope) {
  const message = error && error.message ? error.message : String(error);

  // `USD + 1 USD`: a bare unit has no amount to add to (CUR-07).
  if (/contains a unit with undefined value/i.test(message)) {
    return 'A unit on its own has no amount here; write one, e.g. "1 USD"';
  }

  // `5km to m` after `m = …`: the variable shadows the metre unit, so mathjs
  // hands a number to `to`. Name the variable instead of leaking the type
  // error.
  if (/Unexpected type of argument in function to\b/.test(message)) {
    const target = conversionTarget(code, scope);
    if (target) {
      return `"${target}" is a variable, so it cannot be a unit here; rename it to convert to ${target}`;
    }
  }

  const undefinedSymbol = new RegExp(`^Undefined symbol (${IDENTIFIER_SRC})$`, 'u').exec(message);
  if (undefinedSymbol) return undefinedName(math, undefinedSymbol[1], code, scope);

  const described = describe(message, {
    functionName: () => bareFunctionName(math, code),
    typedUnit: () => typedSourceUnit(code),
    undefinedFunction: (name) =>
      name === 'line'
        ? 'line() needs a whole line number, like line(3)'
        : `"${name}" is not a known function`,
  });
  if (described) return described;

  // Whatever is left: the typed names back, and no offsets into the rewritten text.
  return scrub(message, unmangleName);
}

// The unit as the user wrote it on the left of a conversion (`1500 g to m` -> `g`), since
// mathjs reports the converted value in whatever prefix it simplified to (`1.5 kg`).
function typedSourceUnit(code) {
  const parts = String(code).split(/\s+(?:to|in|as)\s+/i);
  if (parts.length < 2) return null;
  const left = parts[parts.length - 2];
  const match =
    /^[\s\d.,e+\-*/()]*([A-Za-z°µ$€£][\w°µ]*(?:\s*[/^]\s*[A-Za-z°µ\d][\w°µ]*)*)\s*$/.exec(left);
  return match ? match[1] : null;
}

// The first name in the line that is a function but is not followed by `(`: `sqrt 4`.
function bareFunctionName(math, code) {
  for (const match of String(code).matchAll(/\b([A-Za-z_]\w*)\b(?!\s*\()/g)) {
    if (typeof math[match[1]] === 'function') return match[1];
  }
  return null;
}

// Words that join a phrase and are never the unknown part of one.
const CONNECTORS = new Set([
  'in',
  'to',
  'as',
  'per',
  'of',
  'at',
  'for',
  'from',
  'and',
  'on',
  'off',
]);

function isKnownWord(math, word, scope) {
  if (CONNECTORS.has(word.toLowerCase()) || word in scope) return true;
  if (math[word] !== undefined) return true;
  try {
    return Boolean(math.Unit && math.Unit.isValuelessUnit(word));
  } catch {
    return false;
  }
}

function undefinedName(math, symbol, code, scope) {
  const original = unmangleName(symbol);
  if (original) return `"${original}" is not defined`;

  // A function written in capitals (`XOR`, `SQRT`): names are case-sensitive, say which one is meant.
  const lower = symbol.toLowerCase();
  if (symbol !== lower && !(symbol in scope) && typeof math[lower] === 'function') {
    return `"${symbol}" is not defined; did you mean "${lower}"?`;
  }

  // A currency code with no rate behind it: the exchange rates have not arrived (offline, or
  // still loading), which is not the same as a name nobody defined.
  if (isCurrencyCode(symbol) && !(symbol in scope)) {
    return `Exchange rates are not available yet, so "${symbol.toUpperCase()}" cannot be used`;
  }

  let expression = code;
  try {
    expression = preprocess(code);
  } catch {
    // keep the raw code
  }
  const run = new RegExp(
    `(?<![${WORD}_])(${IDENTIFIER_SRC}(?:\\s+${IDENTIFIER_SRC})+)(?![${WORD}_])`,
    'gu'
  );
  let matchRun;
  while ((matchRun = run.exec(expression)) !== null) {
    const words = matchRun[1].split(/\s+/);
    if (!words.includes(symbol)) continue;
    const known = words.some((word) => word !== symbol && isKnownWord(math, word, scope));
    if (!known) return `"${matchRun[1]}" is not defined`;
  }
  return `"${symbol}" is not defined`;
}

export { friendlyError };
