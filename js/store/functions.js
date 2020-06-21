let functions = {};

function addFunction({ label, value }) {
  if (label && value) functions[label] = value;
}

function clearFunctions() {
  Object.keys(functions).forEach(key => key && delete functions[key]);
}

export { addFunction, clearFunctions };
export default functions;