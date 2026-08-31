import { view } from './store/view.js';

function printInputs(viewNode) {
  viewNode.innerHTML = '';
  view.forEach(node => viewNode.appendChild(node));
}

export default printInputs;