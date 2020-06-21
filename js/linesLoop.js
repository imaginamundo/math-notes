import { reloadMath } from './store/math.js';
import { clearNodes, addNode } from './store/view.js';
import { addResult, clearResults } from './store/results.js';
import { clearVariables } from './store/variables.js';
import { clearFunctions } from './store/functions.js';

import storeValues from './storeValues.js';
import format from './format.js';

function lineLoop(childNodes) {
  clearNodes();
  reloadMath();
  clearResults();
  clearVariables();
  clearFunctions();

  [...childNodes].map(node => {
    if (node.nodeName === '#text') {
      const input = node.textContent;

      storeValues(input);
      addNode(format.line(input));
    } else {
      addResult(null);
      addNode(document.createElement('br'));
    }
  });
}

export default lineLoop;