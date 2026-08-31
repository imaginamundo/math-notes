function parseLine(line) {
  const commentIndex = line.indexOf('#');
  const comment = commentIndex === -1 ? '' : line.slice(commentIndex);
  let code = commentIndex === -1 ? line : line.slice(0, commentIndex);

  let title = '';
  const colonIndex = code.indexOf(':');
  if (colonIndex !== -1) {
    const codeEquals = code.indexOf('=');
    const candidate = code.slice(0, colonIndex).trim();
    if (candidate && (codeEquals === -1 || codeEquals > colonIndex) && /^[A-Za-z_][A-Za-z0-9_ ]*$/.test(candidate)) {
      title = candidate;
      code = code.slice(colonIndex + 1).trim();
    }
  }

  const equalsIndex = code.indexOf('=');
  const label = equalsIndex === -1 ? '' : code.slice(0, equalsIndex).trim();
  const rhs = equalsIndex === -1 ? '' : code.slice(equalsIndex + 1).trim();
  const isAssignment = label !== '' && rhs !== '';

  return { code, comment, label, rhs, isAssignment, equalsIndex, title };
}

export default parseLine;
