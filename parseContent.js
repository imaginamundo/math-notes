import formatContent from './formatContent.js';

function parseContent(childNodes) {
  return [...childNodes].map(node => {
    if (node.nodeName === '#text') {
      return formatContent(node.textContent);
    } else {
      return document.createElement('br');
    }
  });
}

export default parseContent;