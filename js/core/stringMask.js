// Quoted text is data, not code. Every rewrite that works on a line's raw text
// (phrase preprocessors, aggregate substitution, multi-word-name mangling) must
// leave it alone, so a string like "2k items" or "total" reaches mathjs as typed.
//
// A string is `"..."` or `'...'` with backslash escapes, matching how `parseLine`
// reads quotes. An unclosed quote is not a string and is left as it is.

const STRING = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;
const SLOT = /\uE000(\d+)\uE000/g;

// Replace each string's content with an inert slot (`"\uE0000\uE000"`), keeping its
// quotes so the line's structure is unchanged. `restore` puts the content back.
function maskStrings(text) {
  if (!text.includes('"') && !text.includes("'")) return { text, restore: (out) => out };
  const originals = [];
  const masked = text.replace(STRING, (match) => {
    originals.push(match.slice(1, -1));
    return `${match[0]}\uE000${originals.length - 1}\uE000${match[0]}`;
  });
  if (!originals.length) return { text, restore: (out) => out };
  return {
    text: masked,
    restore: (out) => out.replace(SLOT, (_, index) => originals[Number(index)] ?? ''),
  };
}

// Apply a text rewrite to the code between strings only.
function outsideStrings(text, rewrite) {
  const { text: masked, restore } = maskStrings(text);
  return restore(rewrite(masked));
}

export { maskStrings, outsideStrings };
