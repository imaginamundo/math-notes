function createWrapper(type, text) {
  const wrapper = document.createElement('span');
  wrapper.classList.add(type);
  wrapper.textContent = text;
  return wrapper;
}

function line(text) {
  const wrapper = createWrapper('line', '');

  const hashIndex = text.indexOf('#');
  const commentText = hashIndex === -1 ? '' : text.slice(hashIndex);
  const codeText = hashIndex === -1 ? text : text.slice(0, hashIndex);

  if (codeText) {
    const equalsIndex = codeText.indexOf('=');
    if (equalsIndex > 0) {
      wrapper.appendChild(variable(codeText.slice(0, equalsIndex)));
      wrapper.appendChild(document.createTextNode(codeText.slice(equalsIndex)));
    } else {
      wrapper.appendChild(document.createTextNode(codeText));
    }
  }
  if (commentText) wrapper.appendChild(comment(commentText));

  return wrapper;
}

function variable(text) {
  return createWrapper('variable', text);
}

function comment(text) {
  return createWrapper('comment', text);
}

export default { line, variable, comment };