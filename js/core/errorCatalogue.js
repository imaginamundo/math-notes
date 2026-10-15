// Plain-language messages for the errors mathjs raises. One catalogue, in one voice:
// impersonal, no first person, the user's own words in double quotes, "list" where
// mathjs says "matrix", and no internal function names (`addScalar`) or `(char N)`
// offsets that count the rewritten text instead of the typed line.
//
// Every rule is `[pattern, build]`; the first pattern that matches the mathjs message
// builds the reply. `build(match, context)` may return null to pass.

// What a mathjs type name means to a reader.
const KINDS = [
  [/^(?:number|BigNumber|bigint|Fraction|Complex)$/, 'a number'],
  [/^Unit$/, 'a unit'],
  [/^Date$/, 'a date'],
  [/^string$/, 'text'],
  [/^boolean$/, 'true or false'],
  [/^(?:Array|Matrix|DenseMatrix|SparseMatrix)$/, 'a list'],
  [/^function$/, 'a function'],
  [/^Object$/, 'an object'],
  [/^null$/, 'nothing'],
];

function kindOf(type) {
  const first = String(type).split('|')[0].trim();
  for (const [pattern, name] of KINDS) if (pattern.test(first)) return name;
  return 'a different kind of value';
}

function expects(expected, word) {
  return new RegExp(`\\b${word}\\b`).test(expected);
}

const ADD_SUBTRACT = /^(?:add|subtract)(?:Scalar)?$/;
const MULTIPLY_DIVIDE = /^(?:multiply|divide|dotMultiply|dotDivide|pow|dotPow|mod)(?:Scalar)?$/;
const LOGIC = /^(?:and|or|xor|not)$/;

function typeMismatch(fn, expected, actual, index, context) {
  const kind = kindOf(actual);

  if (kind === 'a function') {
    const name = context.functionName();
    return name
      ? `"${name}" is a function; write its value in parentheses, like ${name}(4)`
      : 'A function name needs its value in parentheses, like sqrt(4)';
  }
  if (kind === 'a date' && ADD_SUBTRACT.test(fn)) {
    return 'A date can only be added to or subtracted by a duration (like 3 days), or subtracted from another date';
  }
  if (kind === 'a date' && fn === 'to') return 'A date cannot be converted to a unit';
  if (kind === 'a date' && MULTIPLY_DIVIDE.test(fn)) {
    return 'A date cannot be multiplied, divided or raised to a power';
  }
  if (ADD_SUBTRACT.test(fn)) {
    if (
      (kind === 'a unit' && !expects(expected, 'Unit')) ||
      (kind === 'a number' && /^Unit/.test(expected))
    ) {
      return 'A plain number and a unit cannot be added or subtracted; give both a unit, like 5 kg + 3 kg';
    }
    if (kind === 'text') return 'Text cannot be added to or subtracted from a value';
    return 'These values cannot be added or subtracted';
  }
  if (MULTIPLY_DIVIDE.test(fn)) {
    if (kind === 'text') return 'Text cannot be used in a calculation';
    return 'These values cannot be multiplied, divided or raised to a power';
  }
  if (fn === 'to') {
    if (index === 1) return '"to" needs a unit after it, like km or USD';
    return '"to" needs an amount with a unit before it, like 5 km to m';
  }
  if (LOGIC.test(fn)) {
    return `"${fn}" works on true/false conditions; to join amounts, use +`;
  }
  if (fn === 'range')
    return 'That is not a time or a range of numbers; a time looks like 9:30 or 9:30 am';
  const needs = expects(expected, 'number')
    ? 'a number'
    : expects(expected, 'Unit')
      ? 'a unit'
      : expects(expected, 'Array')
        ? 'a list'
        : null;
  return needs ? `${fn} needs ${needs}, not ${kind}` : `${fn} cannot be used with ${kind}`;
}

// What the user typed after `to`/`in`/`as`: `5 kg` -> `kg`, `0.333 kg` -> `kg`.
function unitOf(text) {
  return String(text)
    .replace(/^-?[\d.]+(?:e[+-]?\d+)?\s*/i, '')
    .trim();
}

const RULES = [
  [
    /^Unexpected type of argument in function (\w+) \(expected: (.*), actual: (.*), index: (\d+)\)$/,
    (m, context) => typeMismatch(m[1], m[2], m[3], Number(m[4]), context),
  ],
  [/^Too few arguments in function (\w+)/, (m) => `${m[1]} needs a value, like ${m[1]}(4)`],
  [
    /^Too many arguments in function (\w+) \(expected: (\d+), actual: (\d+)\)/,
    (m) => `${m[1]} takes ${m[2]} value${m[2] === '1' ? '' : 's'}, not ${m[3]}`,
  ],
  [
    /^Cannot calculate (\w+), unexpected type of argument \(type: (\w+)/,
    (m) => `${m[1]} needs numbers, or amounts in one unit, not ${kindOf(m[2])}`,
  ],
  [
    /^Signature not found \(signature: (\w+)\(/,
    (m) =>
      m[1] === 'unaryMinus'
        ? 'A unit on its own has no amount to negate; write one, like -1 kg'
        : 'That combination of values is not supported',
  ],
  [/^Dimension mismatch/, () => 'Lists need the same length to be combined'],
  [/^Cannot convert "(.*)" to a number/, () => 'Text cannot be used in a calculation'],
  [
    /^Unit in function \w+ is no angle/,
    () => 'An angle is needed here, like 30 deg; a plain unit is not one',
  ],
  [/^Matrix must be square/, () => 'A list cannot be divided into or raised to a power this way'],
  [
    /^Cannot convert to a unit with a value/,
    () => 'The unit after "to" has no amount; write only the unit, like km',
  ],
  [/^Unit "(.*)" not found\.?$/, (m) => `"${m[1]}" is not a unit`],
  [
    /^Cannot convert (.+) to (.+)$/,
    (m, context) => `Cannot convert "${context.typedUnit() || unitOf(m[1])}" to "${unitOf(m[2])}"`,
  ],
  [
    /^Units do not match \('(.+)' != '(.+)'\)$/,
    (m, context) => `Cannot convert "${context.typedUnit() || unitOf(m[2])}" to "${unitOf(m[1])}"`,
  ],
  [
    /^Units do not match$/,
    () => 'These units measure different things, so they cannot be added or subtracted',
  ],
  [/^'(\w+)' is not a function; its value is:/s, (m) => `"${m[1]}" is a value, not a function`],
  [/^Undefined function (\w+)$/, (m, context) => context.undefinedFunction(m[1])],
  [/^Parenthesis \) expected/, () => 'A closing ")" is missing'],
  [/^End of matrix \] expected/, () => 'A list is missing its closing "]"'],
  [/^Unexpected end of expression/, () => 'The line ends before the calculation is finished'],
  [/^Value expected/, () => 'A value is missing here'],
  [/^Unexpected operator (.+?)(?: \(char \d+\))?$/, (m) => `Unexpected "${m[1]}"`],
  [/^Unexpected part "(.*)"/, (m) => `Unexpected "${m[1]}"`],
  [/^Syntax error in part "(.*?)"/, (m) => `"${m[1]}" is not understood here`],
  [/^Property name expected after dot/, () => 'A name is needed after the dot'],
  [/^Symbol or string expected as object key/, () => 'An object key must be a name or text'],
  [/^Cannot assign to symbol "(.*)"/, (m) => `"${m[1]}" is a reserved word`],
];

// The first matching rule's message, or null.
function describe(message, context) {
  for (const [pattern, build] of RULES) {
    if (!build) continue;
    const match = pattern.exec(message);
    if (!match) continue;
    const text = build(match, context);
    if (text) return text;
  }
  return null;
}

// Clean what is left of a message nobody matched: internal names back to the typed
// ones, and offsets dropped (they point into the rewritten text).
function scrub(message, unmangle) {
  return message
    .replace(/__var_\w+/g, (token) => unmangle(token) || token)
    .replace(/__date\("([^"]*)"\)/g, '$1')
    .replace(/ \(char \d+\)/g, '');
}

export { describe, scrub, kindOf };
