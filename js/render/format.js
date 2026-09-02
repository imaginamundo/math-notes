import parseLine from '../core/parseLine.js';
import { SYMBOL_SOURCE } from '../eval/symbols.js';

const RULES = {
  whitespace: /^\s+/,
  number: /^\d*\.?\d+(e[+-]?\d+)?/i,
  currency: new RegExp(`^(?:${SYMBOL_SOURCE})`),
  identifier: /^[A-Za-z_][A-Za-z0-9_]*/,
  operator: /^[+\-*/^=(),%!<>]/,
};

function createWrapper(type, text) {
  const wrapper = document.createElement('span');
  wrapper.classList.add(type);
  wrapper.textContent = text;
  return wrapper;
}

// `kind` comes from the grouping pre-pass (js/core/blocks.js). Lines inside a
// `###` block, and the fences themselves, are comment text end to end — there
// is nothing to tokenize.
function line(text, kind) {
  const wrapper = createWrapper('line', '');
  if (kind === 'comment' || kind === 'fence') {
    if (text) wrapper.appendChild(comment(text));
    return wrapper;
  }
  const { rawCode, comment: commentText, titleIndex } = parseLine(text);

  if (titleIndex !== -1) {
    wrapper.appendChild(titleWrap(rawCode.slice(0, titleIndex + 1)));
    if (titleIndex + 1 < rawCode.length) appendCode(wrapper, rawCode.slice(titleIndex + 1));
  } else if (rawCode) {
    appendCode(wrapper, rawCode);
  }
  if (commentText) wrapper.appendChild(comment(commentText));

  return wrapper;
}

function appendCode(wrapper, code) {
  let rest = code;
  while (rest) {
    let match = RULES.whitespace.exec(rest);
    if (match) {
      const [token] = match;
      wrapper.appendChild(document.createTextNode(token));
      rest = rest.slice(token.length);
      continue;
    }
    match = RULES.number.exec(rest);
    if (match) {
      const [token] = match;
      wrapper.appendChild(number(token));
      rest = rest.slice(token.length);
      continue;
    }
    match = RULES.currency.exec(rest);
    if (match) {
      const [token] = match;
      wrapper.appendChild(currency(token));
      rest = rest.slice(token.length);
      continue;
    }
    match = RULES.identifier.exec(rest);
    if (match) {
      const [token] = match;
      wrapper.appendChild(variable(token));
      rest = rest.slice(token.length);
      continue;
    }
    match = RULES.operator.exec(rest);
    if (match) {
      const [token] = match;
      wrapper.appendChild(operator(token));
      rest = rest.slice(token.length);
      continue;
    }
    wrapper.appendChild(document.createTextNode(rest[0]));
    rest = rest.slice(1);
  }
}

function variable(text) {
  return createWrapper('variable', text);
}

function number(text) {
  return createWrapper('number', text);
}

function currency(text) {
  return createWrapper('currency', text);
}

function operator(text) {
  return createWrapper('operator', text);
}

function comment(text) {
  return createWrapper('comment', text);
}

function titleWrap(text) {
  return createWrapper('title', text);
}

export default { line, variable, number, currency, operator, comment };
