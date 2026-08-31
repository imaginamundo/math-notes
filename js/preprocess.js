import { preprocessSymbols } from './currency.js';
import { preprocessScales } from './scales.js';
import { preprocessPercent } from './percentage.js';
import { preprocessWordOps } from './wordOperators.js';

export default function preprocess(expression) {
  return preprocessWordOps(preprocessPercent(preprocessSymbols(preprocessScales(expression))));
}
