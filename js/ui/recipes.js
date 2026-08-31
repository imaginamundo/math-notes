import initModal from './modal.js';
import initExamples from './examples.js';

function initRecipes(contentEditableNode) {
  const recipesButtonNode = document.getElementById('recipes-button');
  const recipesModalNode = document.getElementById('recipes-modal');

  const { close } = initModal(recipesModalNode, recipesButtonNode, {
    onClose: () => contentEditableNode.focus(),
  });

  initExamples(recipesModalNode, contentEditableNode, close);
}

export default initRecipes;
