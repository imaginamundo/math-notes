let view = []

function addNode(node) {
  view.push(node);
}

function clearNodes() {
  view = [];
}

export { view, addNode, clearNodes };