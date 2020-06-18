function formatResults(text) {
  const line = document.createElement('span');
  line.classList.add('line');

  /**
   * Format each type of value to create his own wrapper
   * Wrapper are on colors.js
   */

  line.textContent = text;

  return line;
}

export default formatResults;