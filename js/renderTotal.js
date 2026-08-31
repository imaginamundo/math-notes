function renderTotal(totalNode, total) {
  totalNode.textContent = total === null ? '' : total;
}

export default renderTotal;
