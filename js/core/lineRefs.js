// Replace `line(n)` with an internal token bound to the value of line n, which
// must be a value row above the current line. Returns the rewritten parsed line
// and the scope values to inject, or an error message.
function resolveLineRefs(parsed, results, index) {
  const values = {};
  let error = null;

  const replace = (text) =>
    text.replace(/\bline\s*\(\s*(\d+)\s*\)/g, (match, digits) => {
      if (error) return match;
      const n = Number(digits);
      if (n < 1) {
        error = `Line ${n} does not exist`;
        return match;
      }
      if (n > index) {
        error = `Line ${n} is below this line`;
        return match;
      }
      const ref = results[n - 1];
      if (
        !ref ||
        ref.type !== 'value' ||
        ref.value === undefined ||
        typeof ref.value === 'function'
      ) {
        error = `Line ${n} has no value`;
        return match;
      }
      const token = `__line_${n}`;
      values[token] = ref.value;
      return token;
    });

  return {
    parsed: {
      ...parsed,
      code: replace(parsed.code),
      rhs: parsed.rhs ? replace(parsed.rhs) : parsed.rhs,
    },
    values,
    error,
  };
}

export { resolveLineRefs };
