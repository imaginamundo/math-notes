import * as mathjs from 'https://cdn.pika.dev/mathjs@^7.0.0';


function parseValues(result) {
  /**
   * Regex to identify variables and maths
   * 
   * Variables are written in on way:
   * variable = value
   */
  let variable;
  let response;
  try {
    const containNumber = /\d/.test(result);
    response = containNumber && result && mathjs.evaluate(result.trim());
  } catch (error) {}

  return [response, variable];
}

export default parseValues;