import { preprocessSymbols } from './currency.js';
import { preprocessScales } from './scales.js';

export default function preprocess(expression) {
  return preprocessSymbols(preprocessScales(expression));
}
