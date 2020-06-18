function findVariables(math, text = '') {
  const [label, value] = text.split(/=/);
  let evaluatedValue;
  try {
    evaluatedValue = math.evaluate(value.trim());
  } catch (error) {}

  console.log(evaluatedValue);

  if (!evaluatedValue) return null;
  return {
    label: label.trim(),
    value: evaluatedValue
  };
}

export default findVariables;