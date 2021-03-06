let variables = {};

function addVariable({ label, value }) {
  if (label && value) variables[label] = value;
}

function clearVariables() {
  Object.keys(variables).forEach(key => key && delete variables[key]);
}

export { variables, addVariable, clearVariables };