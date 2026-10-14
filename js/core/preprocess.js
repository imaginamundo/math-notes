import { preprocessSymbols } from '../eval/symbols.js';
import { preprocessScales } from '../eval/scales.js';
import { preprocessPercent } from '../eval/percentage.js';
import { preprocessUnitRuns } from '../eval/unitRuns.js';
import { maskStrings } from './stringMask.js';
import { IDENTIFIER_SRC } from './identifiers.js';
import { stripGrouping } from './numberGrouping.js';
import { preprocessWordOps } from '../eval/wordOperators.js';
import { preprocessMeasures } from '../eval/measures.js';
import { preprocessRates } from '../eval/rates.js';
import { preprocessCalendar } from '../eval/calendar.js';
import { preprocessTimespan } from '../eval/timespan.js';
import { preprocessRounding } from '../eval/rounding.js';

// Applied in order. Unit runs (`6 ft 2 in`) are joined before anything reads the
// words around them; measures run next so a scale-like subject (`4k video`) is
// recognised before `scales` rewrites it. Scales before currency so `$2k`
// expands to `2000 USD`; percentage before word operators so its `of|on|off`
// phrases are consumed first; calendar before timespans so a date's `as`
// pattern is not read as a conversion; rounding last, so it wraps the
// normalised value.
//
// `context` is passed to every step (most ignore it); the currency step uses
// `context.names` to leave a code that is a defined variable alone.
const STEPS = [
  stripGrouping,
  preprocessUnitRuns,
  preprocessMeasures,
  preprocessScales,
  preprocessSymbols,
  preprocessPercent,
  preprocessWordOps,
  preprocessRates,
  preprocessCalendar,
  preprocessTimespan,
  preprocessRounding,
];

// Quoted text is masked for the whole pipeline, so no step reads or rewrites it.

// The steps that need the whole line (a comma means something different once the
// line is cut into arguments) run once up front; the rest are phrase rewrites.
const WHOLE_LINE_STEPS = [stripGrouping];
const PHRASE_STEPS = STEPS.filter((step) => !WHOLE_LINE_STEPS.includes(step));

// Most phrases are anchored to the whole expression they rewrite, so they only
// work if they are handed exactly one expression. `rewriteExpression` hands them
// the innermost body of `a = f(x) = body` and every bracketed group or call
// argument, one at a time, innermost first. The rewritten inside of a group is
// parked in a slot while the outside is rewritten, so each piece is rewritten once
// and an outer phrase sees `( … )` as a single operand.
const ASSIGNMENT_PREFIX = new RegExp(
  `^(?:\\s*${IDENTIFIER_SRC}\\s*(?:\\([^()]*\\))?\\s*=(?!=)\\s*)+`,
  'u'
);
const GROUP_SLOT = /(\d+)/g;
const OPENERS = { '(': ')', '[': ']' };

// The index of the bracket closing the one at `open`, or -1.
function closingIndex(text, open) {
  const stack = [OPENERS[text[open]]];
  for (let i = open + 1; i < text.length; i++) {
    const ch = text[i];
    if (OPENERS[ch]) stack.push(OPENERS[ch]);
    else if (ch === ')' || ch === ']') {
      if (stack[stack.length - 1] !== ch) return -1;
      stack.pop();
      if (!stack.length) return i;
    }
  }
  return -1;
}

// Cut at commas that are not inside a bracket or brace.
function splitArguments(text) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

// `1:50` alone on a line is a time of day, but inside a group or an argument it is
// the list `1:50` (`concat(1:50, 1:50)`), so a bare `h:mm` part is left as written.
const BARE_RANGE = /^\s*\d+:\d+\s*$/;

function rewriteExpression(text, context, slots, nested = false) {
  if (nested && BARE_RANGE.test(text)) return text;
  const prefix = ASSIGNMENT_PREFIX.exec(text);
  const head = prefix ? prefix[0] : '';
  const body = text.slice(head.length);

  let rebuilt = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    const close = OPENERS[ch] ? closingIndex(body, i) : -1;
    if (close === -1) {
      rebuilt += ch;
      continue;
    }
    const inside = body.slice(i + 1, close);
    const parts = splitArguments(inside).map((part) =>
      rewriteExpression(part, context, slots, true)
    );
    slots.push(parts.join(','));
    rebuilt += `${ch}${slots.length - 1}${body[close]}`;
    i = close;
  }
  return head + PHRASE_STEPS.reduce((result, step) => step(result, context), rebuilt);
}

function fillSlots(text, slots) {
  let out = text;
  for (let guard = 0; guard < 64 && GROUP_SLOT.test(out); guard++) {
    GROUP_SLOT.lastIndex = 0;
    out = out.replace(GROUP_SLOT, (_, index) => slots[Number(index)]);
  }
  GROUP_SLOT.lastIndex = 0;
  return out;
}

// Quoted text is masked for the whole pipeline, so no step reads or rewrites it.
function preprocess(expression, context) {
  const { text, restore } = maskStrings(expression);
  const whole = WHOLE_LINE_STEPS.reduce((result, step) => step(result, context), text);
  const slots = [];
  return restore(fillSlots(rewriteExpression(whole, context, slots), slots));
}

export { STEPS };
export default preprocess;
