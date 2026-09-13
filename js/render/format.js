import parseLine from '../core/parseLine.js';
import { SYMBOL_SOURCE } from '../core/currencySymbols.js';
import { anchoredNamePattern } from '../core/multiWordVariables.js';

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

// `names` are the multi-word variables defined in the sheet (longest first), so
// a whole name can be highlighted as a single variable token.
function line(text, names = []) {
  const wrapper = createWrapper('line', '');
  const { rawCode, tail, comment: commentText, titleIndex } = parseLine(text);
  const patterns = names.map((name) => anchoredNamePattern(name));

  if (titleIndex !== -1) {
    wrapper.appendChild(titleWrap(rawCode.slice(0, titleIndex + 1)));
    if (titleIndex + 1 < rawCode.length) {
      appendCode(wrapper, rawCode.slice(titleIndex + 1), patterns);
    }
  } else if (rawCode.trim() === 'end') {
    // A group's closing row shares the label colour so header and end read as
    // a matching pair.
    wrapper.appendChild(titleWrap(rawCode));
  } else if (rawCode) {
    appendCode(wrapper, rawCode, patterns);
  }
  if (tail) {
    // The comment is a suffix of the tail; render the tags/whitespace before it,
    // then the whole comment as one span (so `### note` is a single colour).
    const before = commentText ? tail.slice(0, tail.length - commentText.length) : tail;
    if (before) appendTags(wrapper, before);
    if (commentText) wrapper.appendChild(comment(commentText));
  }

  return wrapper;
}

// Render the part of a line after its first `#`, up to any comment: tags
// (`.tag`) and whitespace.
function appendTags(wrapper, tail) {
  let rest = tail;
  while (rest) {
    const tagMatch = /^#([A-Za-z0-9_-]+)/.exec(rest);
    if (tagMatch) {
      wrapper.appendChild(tag(tagMatch[0]));
      rest = rest.slice(tagMatch[0].length);
      continue;
    }
    const whitespace = /^\s+/.exec(rest);
    if (whitespace) {
      wrapper.appendChild(document.createTextNode(whitespace[0]));
      rest = rest.slice(whitespace[0].length);
      continue;
    }
    wrapper.appendChild(document.createTextNode(rest[0]));
    rest = rest.slice(1);
  }
}

function appendCode(wrapper, code, patterns = []) {
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
    // A defined multi-word name wins over a single identifier.
    const nameMatch = matchName(rest, patterns);
    if (nameMatch) {
      wrapper.appendChild(variable(nameMatch));
      rest = rest.slice(nameMatch.length);
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

function matchName(text, patterns) {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) return match[0];
  }
  return null;
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

function tag(text) {
  return createWrapper('tag', text);
}

function titleWrap(text) {
  return createWrapper('title', text);
}

export default { line, variable, number, currency, operator, comment, tag };
