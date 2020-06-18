import parseContent from './parseContent.js';

function updateView(contentEditable, view) {
  const content = parseContent(contentEditable.childNodes);
  view.innerHTML = '';
  content.forEach(node => view.appendChild(node));
}

export default updateView;