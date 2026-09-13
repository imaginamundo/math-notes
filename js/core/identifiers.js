// Unicode-aware identifier character classes, shared by the parser, the
// highlighter and autocomplete so labels, variables and tags work for any
// script: `\p{L}` is a letter, `\p{N}` a digit and `\p{M}` a combining accent
// mark (for a decomposed `e` + U+0301). So `açai`, `picolé` and `#aáeáãd` are
// single tokens rather than breaking at the first non-ASCII character.
//
// Every consumer must build its RegExp with the `u` flag.
const LETTER = '\\p{L}\\p{M}';
const WORD = '\\p{L}\\p{N}\\p{M}';
const IDENTIFIER_SRC = `[${LETTER}_][${WORD}_]*`;
const TAG_NAME_SRC = `[${WORD}_-]+`;

export { LETTER, WORD, IDENTIFIER_SRC, TAG_NAME_SRC };
