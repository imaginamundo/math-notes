// The grouping pre-pass: lets one logical unit span several physical lines.
//
// Two mechanisms share it:
//
//   Block comments   a `###` fence line toggles comment mode; every line until
//                    the closing fence (or the end of the sheet) is comment
//                    text — not evaluated, no ghost result, no contribution to
//                    the total. `###` rather than `/* */` because `*` and `/`
//                    are operators the tokenizer already owns.
//
//   Continuation     a line whose code ends in a dangling operator, or in an
//                    explicit `\`, joins with the line below. The joined
//                    expression is evaluated ONCE and its result renders on the
//                    LAST physical line of the run.
//
// Grouping is DERIVED, never stored: `groupLines` is a single forward pass with
// no state carried between calls, cheap enough to run on every evaluation. The
// results array stays indexed by physical line, so `renderInput`'s row reuse,
// `find.js`'s `.line-row`-counting walker and the line-number gutter are all
// untouched.

/**
 * @typedef {Object} LineGroup
 * @property {('code'|'comment'|'fence'|'continuation'|'blank')} kind
 * @property {number} ownerIndex   Line whose result the group renders on.
 * @property {number} startIndex   First physical line of the group.
 * @property {string} code         For the owner: the expression to evaluate.
 */

const FENCE = '###';

// A line ending in one of these is unfinished, so it reaches for the next one.
const DANGLING_OPERATOR = /[+\-*/^(,]$/;
const EXPLICIT_CONTINUATION = /\\$/;

function isFence(line) {
  return line.trim().startsWith(FENCE);
}

// The code half of a line: everything before the first `#`. Mirrors parseLine.
function codeOf(line) {
  const hash = line.indexOf('#');
  return hash === -1 ? line : line.slice(0, hash);
}

function dangles(code) {
  const trimmed = code.replace(/\s+$/, '');
  if (!trimmed) return false;
  return EXPLICIT_CONTINUATION.test(trimmed) || DANGLING_OPERATOR.test(trimmed);
}

function joinPart(code) {
  return code.replace(/\s+$/, '').replace(EXPLICIT_CONTINUATION, '').trim();
}

function group(kind, ownerIndex, startIndex, code) {
  return { kind, ownerIndex, startIndex, code };
}

/**
 * Classify every physical line of a sheet.
 * Always returns one entry per line, in order.
 * @param {string[]} lines
 * @returns {LineGroup[]}
 */
function groupLines(lines) {
  const groups = new Array(lines.length).fill(null);

  // Pass 1 — fences and their block bodies. These win over everything else: a
  // blank line inside a block is comment text, not a block separator.
  let inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    if (isFence(lines[i])) {
      // A fence is a toggle, so a second `###` inside a block closes it.
      inBlock = !inBlock;
      groups[i] = group('fence', i, i, '');
    } else if (inBlock) {
      groups[i] = group('comment', i, i, '');
    }
  }

  // Pass 2 — continuation runs over what is left.
  let i = 0;
  while (i < lines.length) {
    if (groups[i]) {
      i++;
      continue;
    }
    if (lines[i].trim() === '') {
      groups[i] = group('blank', i, i, '');
      i++;
      continue;
    }

    const start = i;
    const members = [];
    // Comment-only lines swallowed mid-run: transparent, they neither end the
    // run nor contribute code.
    const passengers = [];
    let current = start;
    for (;;) {
      members.push(current);
      if (!dangles(codeOf(lines[current]))) break;

      let next = current + 1;
      while (
        next < lines.length &&
        !groups[next] &&
        lines[next].trim() !== '' &&
        codeOf(lines[next]).trim() === ''
      ) {
        passengers.push(next);
        next++;
      }
      // A blank line, a fence, or the end of the sheet interrupts the run. The
      // dangling expression is then evaluated as written, so the user sees the
      // syntax error rather than a silently swallowed line.
      if (next >= lines.length || groups[next] || lines[next].trim() === '') break;
      current = next;
    }

    const owner = members[members.length - 1];
    const code =
      members.length === 1
        ? // Verbatim, comment and all, so a plain line parses exactly as before.
          lines[owner]
        : members.map((index) => joinPart(codeOf(lines[index]))).join(' ');

    for (const index of members) {
      groups[index] =
        index === owner
          ? group('code', owner, start, code)
          : group('continuation', owner, start, '');
    }
    for (const index of passengers) {
      groups[index] = group('comment', owner, start, '');
    }

    i = Math.max(owner, ...passengers, start) + 1;
  }

  return groups;
}

export { groupLines, isFence, dangles };
export default groupLines;
