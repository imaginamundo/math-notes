function formatView(text) {
  const line = document.createElement('span');
  line.classList.add('line');

  /**
   * Format each type of value to create his own wrapper
   * Wrapper are on colors.js
   */

  line.textContent = text
    .replace(/\*/g, '×');

  return line;
}

export default formatView;