// Multi-word variables (`monthly rent = 1500`, then `monthly rent * 12`).
//
// Names are collected from assignment labels that contain whitespace and
// rewritten to a single safe identifier, so mathjs can store and resolve them.
// The same helpers are shared by the evaluator (which rewrites lines) and the
// highlighter (which draws a whole name as one variable token). Pure: no mathjs
// import.

const NAME_WORDS = /^\s*([A-Za-z_][A-Za-z0-9_]*(?:\s+[A-Za-z_][A-Za-z0-9_]*)+)\s*=(?!=)/;
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
function namePattern(name, { global = true } = {}) {
  const words = name.split(' ').map(escapeRegExp).join('\\s+');
  const flags = global ? 'g' : '';
  return new RegExp(`(?<![A-Za-z0-9_])${words}(?![A-Za-z0-9_])`, flags);
}

// Anchored form for the highlighter: matches a name at the start of the text.
function anchoredNamePattern(name) {
  const words = name.split(' ').map(escapeRegExp).join('\\s+');
  return new RegExp(`^${words}(?![A-Za-z0-9_])`);
}

function collectVariableNames(lines) {
  const names = new Set();
  for (const line of lines) {
    const match = NAME_WORDS.exec(line.split('#')[0]);
    if (match) names.add(match[1].replace(/\s+/g, ' '));
  }
  // Longest first so `net price` wins over a `price` defined elsewhere.
  return [...names].sort((a, b) => b.length - a.length);
}

// Whether a line defines a multi-word name (`monthly rent = 1500`). Cheap, so
// the renderer can test only the lines an edit touched before deciding it needs
// to rebuild the whole name list.
function isMultiWordDefinition(line) {
  return NAME_WORDS.test(line.split('#')[0]);
}

function mangleLines(lines) {
  const names = collectVariableNames(lines);
  if (!names.length) return lines;
  return lines.map((line) => {
    const hash = line.indexOf('#');
    const code = hash === -1 ? line : line.slice(0, hash);
    const comment = hash === -1 ? '' : line.slice(hash);
    let out = code;
    for (const name of names) out = out.replace(namePattern(name), mangleName(name));
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
