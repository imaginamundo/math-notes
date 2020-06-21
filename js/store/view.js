let view = {
  nodes: []
}

function addNode(node) {
  view.nodes.push(node);
}

function clearNodes() {
  delete view.nodes;
  view.nodes = [];
}

export { addNode, clearNodes };
export default view;