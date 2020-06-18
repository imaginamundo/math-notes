import parseValues from './parseValues.js';
import formatView from './formatView.js';

function parseContent(childNodes) {
  return [...childNodes].map(node => {
    if (node.nodeName === '#text') {
      parseValues(node.textContent);
      return formatView(node.textContent);
    }
    return document.createElement('br');
  });
}

export default parseContent;