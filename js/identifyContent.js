function identifyContent(text) {
  /**
   * Problably use this function to identify items for syntax highlight
   * 
   * Input:
   * variableName = 8
   * 
   * Return:
   * [
   *    {
   *      type: 'variable',
   *      label: 'variableName'
   *    },
   *    {
   *      type: 'equal',
   *      label: '='
   *    },
   *    {
   *      type: 'value',
   *      label: '8'
   *    }
   * ]
   * 
   * Input:
   * variableName = 8 + 8
   * 
   * Return:
   * [
   *    {
   *      type: 'variable',
   *      label: 'variableName'
   *    },
   *    {
   *      type: 'equal',
   *      label: '='
   *    },
   *    {
   *      type: 'value',
   *      label: '8'
   *    },
   *    {
   *      type: 'plus',
   *      label: '+'
   *    },
   *    {
   *      type: 'value',
   *      label: '8'
   *    }
   * ]
   */
};

export default identifyContent;