import parseLine from './parseLine.js';
import { SYMBOL_SOURCE } from './symbols.js';

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

function line(text) {
  const wrapper = createWrapper('line', '');
  const { code, comment: commentText, title } = parseLine(text);

  if (title) wrapper.appendChild(titleWrap(title));
  if (code) appendCode(wrapper, code);
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

export default { line, variable, number, currency, operator, comment, title: titleWrap };
