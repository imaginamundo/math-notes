function createWrapper(type, text) {
  const wrapper = document.createElement('span');
  wrapper.classList.add(type);
  wrapper.textContent = text;
  return wrapper;
}

function line(text) {
  return createWrapper('line', text);
}

function variable(text) {
  return createWrapper('variable', text);
}

function comment(text) {
  return createWrapper('comment', text);
}

export default { line, variable, comment };