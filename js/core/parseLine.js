import { LETTER, WORD, TAG_NAME_SRC } from './identifiers.js';

// A tag is `#word` (no space); `#` followed by whitespace starts a comment.
const TAG = new RegExp(`^#(${TAG_NAME_SRC})`, 'u');
const TITLE = new RegExp(`^[${LETTER}_][${WORD}_ ]*$`, 'u');

function parseLine(line) {
  const tags = [];
  let comment = '';
  let firstSpecial = -1;

  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch !== '#') {
      i++;
      continue;
    }
    if (firstSpecial === -1) firstSpecial = i;
    const after = line.slice(i + 1);
    if (after === '' || /^\s/.test(after)) {
      comment = line.slice(i);
      break;
    }
    const match = TAG.exec(line.slice(i));
    if (match) {
      tags.push(match[1]);
      i += match[0].length;
      continue;
    }
    // A '#' that is neither a tag nor followed by whitespace: treat the rest as
    // a comment rather than guess.
    comment = line.slice(i);
    break;
  }

  const rawCode = firstSpecial === -1 ? line : line.slice(0, firstSpecial);
  const tail = firstSpecial === -1 ? '' : line.slice(firstSpecial);
  const valid = tail === '' || tagsAtEnd(tail);

  let code = rawCode;
  let title = '';
  let titleIndex = -1;

  const colonIndex = rawCode.indexOf(':');
  if (colonIndex !== -1) {
    const codeEquals = rawCode.indexOf('=');
    const candidate = rawCode.slice(0, colonIndex).trim();
    // A colon between digits is a clock time (`now to 23:00`), not a `label:`.
    const clockColon =
      /\d/.test(rawCode[colonIndex - 1] || '') && /\d/.test(rawCode[colonIndex + 1] || '');
    if (
      !clockColon &&
      candidate &&
      (codeEquals === -1 || codeEquals > colonIndex) &&
      TITLE.test(candidate)
    ) {
      title = candidate;
      titleIndex = colonIndex;
      code = rawCode.slice(colonIndex + 1).trim();
    }
  }

  const equalsIndex = findAssignmentEquals(code);
  const label = equalsIndex === -1 ? '' : code.slice(0, equalsIndex).trim();
  const rhs = equalsIndex === -1 ? '' : code.slice(equalsIndex + 1).trim();
  const isAssignment = label !== '' && rhs !== '';

  return {
    code,
    comment,
    tags,
    valid,
    label,
    rhs,
    isAssignment,
    equalsIndex,
    title,
    rawCode,
    tail,
    titleIndex,
  };
}

// After the first tag, only whitespace, further tags and a trailing comment may
// follow; any other code means the tags are used in the calculation rather than
// labelling the line, so `valid` is false.
function tagsAtEnd(tail) {
  let i = 0;
  let sawTag = false;
  while (i < tail.length) {
    const ch = tail[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '#') {
      const after = tail.slice(i + 1);
      if (after === '' || /^\s/.test(after)) return true; // comment to the end
      const match = TAG.exec(tail.slice(i));
      if (match) {
        sawTag = true;
        i += match[0].length;
        continue;
      }
      return true; // '#' treated as a comment start
    }
    if (sawTag) return false;
    i++;
  }
  return true;
}

export default parseLine;

// An `=` is the assignment operator only when it is not part of a comparison
// (==, >=, <=, !=): the first `=` of `==` is followed by one, and the `=` of
// >=/<=/!= is preceded by the operator. Chained assignments (`a = b = 3`) keep
// their later `=` inside the rhs.
function findAssignmentEquals(code) {
  for (let i = 0; i < code.length; i++) {
    if (code[i] !== '=') continue;
    const prev = code[i - 1];
    if (prev === '=' || prev === '!' || prev === '>' || prev === '<') continue;
    if (code[i + 1] === '=') continue;
    return i;
  }
  return -1;
}
