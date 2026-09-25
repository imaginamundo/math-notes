// User-defined units (`unit widget = 3.5 kg`, then `2 widgets`).
//
// mathjs only accepts ASCII-alphanumeric unit names, so a name with spaces or
// accents is registered under a deterministic encoding (`unit` + UTF-8 hex) and
// decoded again for display and error messages. Pure: no mathjs import, shared
// by the evaluator, the name-mangling pass and the renderer.
import parseLine from './parseLine.js';
import { IDENTIFIER_SRC } from './identifiers.js';

const NAME = new RegExp(`^unit\\s+(${IDENTIFIER_SRC}(?:\\s+${IDENTIFIER_SRC})*)$`, 'iu');
const IDENTIFIER_NAME = new RegExp(`^${IDENTIFIER_SRC}(?:\\s+${IDENTIFIER_SRC})*$`, 'u');

// A name mathjs can register as-is, and the shape of an encoded name.
const PLAIN_NAME = /^[A-Za-z][A-Za-z0-9]*$/;
const ENCODED_NAME = /^unit([0-9a-f]+)$/;
const ENCODED_TOKEN = /\bunit[0-9a-f]{2,}\b/g;

// The `unit <name> = <expression>` definition on a line, or null. A line that
// is only `unit` is not a definition (it is a reserved word).
function unitDefinition(line) {
  const parsed = typeof line === 'string' ? parseLine(line) : line;
  if (!parsed.isAssignment) return null;
  const match = NAME.exec(parsed.label.trim());
  if (!match) return null;
  const name = match[1].replace(/\s+/g, ' ').trim();
  if (!IDENTIFIER_NAME.test(name)) return null;
  return { name, definition: parsed.rhs };
}

function isUnitDefinition(line) {
  return unitDefinition(line) !== null;
}

// Best-effort plural of the last word: `box` -> `boxes`, `city` -> `cities`,
// `widget` -> `widgets`. A word already ending in `s` has no separate plural.
function pluralize(word) {
  if (/s$/i.test(word)) return null;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(?:x|z|ch|sh)$/i.test(word)) return `${word}es`;
  return `${word}s`;
}

function unitAliases(name) {
  const words = name.split(' ');
  const plural = pluralize(words[words.length - 1]);
  if (!plural) return [];
  return [[...words.slice(0, -1), plural].join(' ')];
}

function utf8Hex(text) {
  let out = '';
  for (const byte of new TextEncoder().encode(text)) out += byte.toString(16).padStart(2, '0');
  return out;
}

// The mathjs name a user unit is registered under. Names mathjs cannot hold
// (spaces, accents, or a token that looks encoded) are hex-encoded so decoding
// stays unambiguous.
function registeredName(name) {
  if (PLAIN_NAME.test(name) && !ENCODED_NAME.test(name)) return name;
  return `unit${utf8Hex(name)}`;
}

// Decode a single registered name back to its readable form, or null.
function decodeUnitName(token) {
  const match = ENCODED_NAME.exec(token);
  if (!match || match[1].length % 2 !== 0) return null;
  const bytes = new Uint8Array(match[1].length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(match[1].slice(i * 2, i * 2 + 2), 16);
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

// Replace encoded user-unit tokens in a formatted unit string with their
// readable names.
function decodeUserUnits(text) {
  return String(text).replace(ENCODED_TOKEN, (token) => decodeUnitName(token) || token);
}

// Every `unit` definition in the sheet, deduplicated by name, with its aliases.
function collectUnitDefinitions(lines) {
  const seen = new Set();
  const definitions = [];
  for (const line of lines) {
    const definition = unitDefinition(line);
    if (!definition) continue;
    const key = definition.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    definitions.push({ name: definition.name, aliases: unitAliases(definition.name) });
  }
  return definitions;
}

export {
  unitDefinition,
  isUnitDefinition,
  unitAliases,
  registeredName,
  decodeUnitName,
  decodeUserUnits,
  collectUnitDefinitions,
};
