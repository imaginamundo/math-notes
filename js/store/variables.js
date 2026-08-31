let variables = {};

function addVariable({ label, value }) {
  if (label !== undefined && value !== undefined) variables[label] = value;
}

function clearVariables() {
  Object.keys(variables).forEach(key => key && delete variables[key]);
}

export { variables, addVariable, clearVariables };