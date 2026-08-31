import { preprocessSymbols } from './currency.js';
import { preprocessScales } from './scales.js';
import { preprocessWordOps } from './wordOperators.js';

export default function preprocess(expression) {
  return preprocessWordOps(preprocessSymbols(preprocessScales(expression)));
}
