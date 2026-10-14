import preprocess from './preprocess.js';
import { unmangleName } from './multiWordVariables.js';
import { IDENTIFIER_SRC, WORD } from './identifiers.js';

// The identifier after `to`/`in`/`as` when it names a scope variable rather
// than a Unit, so a conversion error can point at the shadowing variable.
function conversionTarget(code, scope) {
  const match = /(?:^|\s)(?:to|in|as)\s+([A-Za-z_]\w*)\s*$/i.exec(code.trim());
  if (!match) return null;
  const name = match[1];
  const value = scope[name];
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

  // `5km to m` after `m = …`: the variable shadows the metre unit, so mathjs
  // hands a number to `to`. Name the variable instead of leaking the type
  // error.
  if (/Unexpected type of argument in function to\b/.test(message)) {
    const target = conversionTarget(code, scope);
    if (target) {
      return `"${target}" is a variable, so it cannot be used as a unit in a conversion. Rename the variable to convert to ${target}.`;
    }
  }

  const match = new RegExp(`^Undefined symbol (${IDENTIFIER_SRC})$`, 'u').exec(message);
  if (!match) return message;
  const symbol = match[1];

  const original = unmangleName(symbol);
  if (original) return `"${original}" is not defined`;

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
    const known = words.some(
      (word) => word !== symbol && (math[word] !== undefined || word in scope)
    );
    if (!known) return `"${matchRun[1]}" is not defined`;
  }
  return message;
}

export { friendlyError };
