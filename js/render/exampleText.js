import parseLine from '../core/parseLine.js';

// Indent the body of a group by two spaces, so a rendered example reads as a
// block:
//
//   Groceries:
//     4.50
//     3.20
//   end
//
// The header and its closing `end` stay flush; blank lines are left untouched.
// Used by the Help and Examples chips for both the shown code and the text the
// chip inserts, so what you see is what you paste.
function indentGroupBodies(text, indent = '  ') {
  let inGroup = false;
  return text
    .split('\n')
    .map((line) => {
      const parsed = parseLine(line);
      if (inGroup && parsed.code.trim() === 'end') {
        inGroup = false;
        return line;
      }
      if (inGroup) {
        return line.trim() === '' ? line : indent + line;
      }
      if (parsed.title !== '' && parsed.code.trim() === '') inGroup = true;
      return line;
    })
    .join('\n');
}

export { indentGroupBodies };
