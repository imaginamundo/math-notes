function parseLine(line) {
  const commentIndex = line.indexOf('#');
  const comment = commentIndex === -1 ? '' : line.slice(commentIndex);
  const code = commentIndex === -1 ? line : line.slice(0, commentIndex);

  const equalsIndex = code.indexOf('=');
  const label = equalsIndex === -1 ? '' : code.slice(0, equalsIndex).trim();
  const rhs = equalsIndex === -1 ? '' : code.slice(equalsIndex + 1).trim();
  const isAssignment = label !== '' && rhs !== '';

  return { code, comment, label, rhs, isAssignment, equalsIndex };
}

export default parseLine;
