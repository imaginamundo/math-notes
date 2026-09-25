// Multi-word variables (`monthly rent = 1500`, then `monthly rent * 12`).
//
// Names are collected from assignment labels that contain whitespace and
// rewritten to a single safe identifier, so mathjs can store and resolve them.
// The same helpers are shared by the evaluator (which rewrites lines) and the
// highlighter (which draws a whole name as one variable token). Pure: no mathjs
// import.

import { IDENTIFIER_SRC, LETTER, WORD } from './identifiers.js';
import { isUnitDefinition, collectUnitDefinitions, registeredName } from './userUnits.js';

// An assignment whose name contains whitespace. A leading `Label:` prefix (the
// parser splits a label from its code) is skipped, so `Total: monthly rent = 1500`
// still defines `monthly rent`.
const NAME_WORDS = new RegExp(
  `^\\s*(?:[^\\n#:]*:\\s*)?(${IDENTIFIER_SRC}(?:\\s+${IDENTIFIER_SRC})+)\\s*=(?!=)`,
  'u'
);
const MANGLE_PREFIX = '__var_';

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// `monthly rent` -> `__var_monthly_rent`. Underscores are doubled first so the
// mapping is reversible.
function mangleName(name) {
  return MANGLE_PREFIX + name.replace(/_/g, '__').replace(/\s+/g, '_');
}

function unmangleName(token) {
  if (!token.startsWith(MANGLE_PREFIX)) return null;
  const body = token.slice(MANGLE_PREFIX.length);
  let out = '';
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== '_') {
      out += body[i];
    } else if (body[i + 1] === '_') {
      out += '_';
      i++;
    } else {
      out += ' ';
    }
  }
  return out;
}

// Matches a whole name (its words separated by any whitespace) with identifier
// boundaries, so `monthly rented` does not match `monthly rent`.
function nameSource(name) {
  return name.split(' ').map(escapeRegExp).join('\\s+');
}

function namePattern(name, { global = true } = {}) {
  const flags = global ? 'gu' : 'u';
  return new RegExp(`(?<![${WORD}_])${nameSource(name)}(?![${WORD}_])`, flags);
}

// Anchored form for the highlighter: matches a name at the start of the text.
function anchoredNamePattern(name) {
  return new RegExp(`^${nameSource(name)}(?![${WORD}_])`, 'u');
}

function collectVariableNames(lines) {
  const names = new Set();
  for (const line of lines) {
    // A unit definition's name is not a variable (`unit monthly rent = 1500`).
    if (isUnitDefinition(line)) continue;
    const match = NAME_WORDS.exec(line.split('#')[0]);
    if (match) names.add(match[1].replace(/\s+/g, ' '));
  }
  // Longest first so `net price` wins over a `price` defined elsewhere.
  return [...names].sort((a, b) => b.length - a.length);
}

// Readable user-unit names and plurals that mathjs cannot register directly,
// mapped to the encoded name they are stored under. Plain names are left for
// mathjs to resolve, so only the encoded ones appear here.
function collectUnitMappings(lines) {
  const mappings = [];
  for (const { name, aliases } of collectUnitDefinitions(lines)) {
    for (const phrase of [name, ...aliases]) {
      const token = registeredName(phrase);
      if (token !== phrase) mappings.push({ phrase, token });
    }
  }
  return mappings;
}

// Whether a line defines a multi-word name (`monthly rent = 1500`). Cheap, so
// the renderer can test only the lines an edit touched before deciding it needs
// to rebuild the whole name list.
function isMultiWordDefinition(line) {
  return NAME_WORDS.test(line.split('#')[0]);
}

function mangleLines(lines) {
  const names = collectVariableNames(lines);
  const units = collectUnitMappings(lines);
  if (!names.length && !units.length) return lines;

  // One alternation (longest phrase first) instead of a regex per name per line,
  // so a sheet with many multi-word names stays linear in the line count. A unit
  // name may follow a digit without a space (`2widgets`), so its boundary only
  // rejects a preceding letter or dot.
  const replacements = new Map();
  const alternatives = [
    ...names.map((name) => ({ phrase: name, token: mangleName(name), unit: false })),
    ...units.map(({ phrase, token }) => ({ phrase, token, unit: true })),
  ]
    .sort((a, b) => b.phrase.length - a.phrase.length)
    .map((entry) => {
      replacements.set(entry.phrase, entry.token);
      const source = nameSource(entry.phrase);
      return entry.unit
        ? `(?<![${LETTER}_.])${source}(?![${WORD}_.])`
        : `(?<![${WORD}_])${source}(?![${WORD}_])`;
    });
  const pattern = new RegExp(alternatives.join('|'), 'gu');

  return lines.map((line) => {
    const hash = line.indexOf('#');
    const code = hash === -1 ? line : line.slice(0, hash);
    const comment = hash === -1 ? '' : line.slice(hash);
    const out = code.replace(
      pattern,
      (match) => replacements.get(match.replace(/\s+/g, ' ')) || match
    );
    return out + comment;
  });
}

export {
  mangleName,
  unmangleName,
  namePattern,
  anchoredNamePattern,
  collectVariableNames,
  isMultiWordDefinition,
  mangleLines,
};
