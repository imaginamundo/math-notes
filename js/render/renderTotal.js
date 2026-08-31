import formatResult from './formatResult.js';

function renderTotal(totalNode, total) {
  totalNode.textContent = total === null ? '' : formatResult(total);
}

export default renderTotal;
