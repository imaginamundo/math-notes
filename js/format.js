import parseLine from './parseLine.js';

function createWrapper(type, text) {
  const wrapper = document.createElement('span');
  wrapper.classList.add(type);
  wrapper.textContent = text;
  return wrapper;
}

function line(text) {
  const wrapper = createWrapper('line', '');
  const { code, comment, equalsIndex } = parseLine(text);

  if (code) {
    if (equalsIndex > 0) {
      wrapper.appendChild(variable(code.slice(0, equalsIndex)));
      wrapper.appendChild(document.createTextNode(code.slice(equalsIndex)));
    } else {
      wrapper.appendChild(document.createTextNode(code));
    }
  }
  if (comment) wrapper.appendChild(comment(comment));

  return wrapper;
}

function variable(text) {
  return createWrapper('variable', text);
}

function comment(text) {
  return createWrapper('comment', text);
}

export default { line, variable, comment };
