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

// Unicode-aware token boundaries for rewriting a word inside an expression.
// A token must not touch another identifier character (`WORD`, underscore) or a
// dot, so `top10k` stays a variable while `2k` and `x + 2k` still rewrite.
const BEFORE_WORD = `(?<![${WORD}_.])`;
const AFTER_WORD = `(?![${WORD}_.])`;

export { LETTER, WORD, IDENTIFIER_SRC, TAG_NAME_SRC, BEFORE_WORD, AFTER_WORD };
