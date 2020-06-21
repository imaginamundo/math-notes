let variables = {};

function addVariable({ label, value }) {
  variables[label] = value;
}

function clearVariables() {
  Object.keys(variables).forEach(key => key && delete variables[key]);
}

export { addVariable, clearVariables };
export default variables;