// The calendar preprocessor: a natural-language grammar that rewrites date,
// clock and workday phrases into `__*` helper calls for the engine. Pure string
// work (no mathjs), so it can be unit-tested on its own.
import parseLine from '../core/parseLine.js';
import { IDENTIFIER_SRC } from '../core/identifiers.js';
import { MONTHS } from './calendarDate.js';

const MONTH_WORD = Object.keys(MONTHS).join('|');
const HOLIDAY_WORD =
  "christmas(?:\\s+(?:eve|day))?|boxing\\s+day|new\\s+year'?s?\\s+(?:eve|day)|valentine'?s?\\s+day|halloween";
const DATE_SRC =
  `(?:today|now|yesterday|tomorrow|${HOLIDAY_WORD}` +
  `|(?:${MONTH_WORD})\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?` +
  `|\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTH_WORD})(?:,?\\s+\\d{4})?` +
  `|\\d{4}-\\d{1,2}-\\d{1,2}|\\d{1,2}[./]\\d{1,2}[./]\\d{2,4})`;
// A date, or a variable that holds one (`start = March 4`, then `start + 2 weeks`).
const IDENT = IDENTIFIER_SRC;
const DATE_OR_IDENT = `(?:${DATE_SRC}|${IDENT})`;
// Duration units, full names and the timespan shorthand (`4h 3m 5s`). The long
// forms come first so `minutes` is not read as `m` + `inutes`.
const DURATION_UNITS_SRC =
  'days?|weeks?|months?|years?|hours?|hrs?|minutes?|mins?|seconds?|secs?|d|w|mo|y|h|m|s';
const DURATION_SRC = `(?:\\d+(?:\\.\\d+)?\\s*(?:${DURATION_UNITS_SRC})\\s*)+`;
const MONTH_YEAR_SRC = `(?:${MONTH_WORD})\\s+\\d{4}`;
// A clock time: `9:45 am`, `7:30am`, `4pm`, `16:00`, `1:30`. A colon time counts
// as a clock when it carries a meridiem or a minute (two digits); a one-digit
// minute (`1:5`) stays a mathjs range.
const CLOCK_SRC =
  `(?:(?:[01]?\\d|2[0-3]):[0-5]\\d\\s*[ap]\\.?m\\.?` +
  `|(?:0?[1-9]|1[0-2])\\s*[ap]\\.?m\\.?` +
  `|(?:[01]?\\d|2[0-3]):[0-5]\\d)`;

const DATE_ONLY = new RegExp(`^(${DATE_SRC})$`, 'i');
const DATE_LITERAL = new RegExp(`^(?:${DATE_SRC})$`, 'i');
const IDENT_ONLY = new RegExp(`^${IDENT}$`, 'u');
const DATE_PAIR = new RegExp(`^(${DATE_SRC})\\s*(?:-|to)\\s*(${DATE_SRC})$`, 'i');
const DATE_DURATION = new RegExp(`^(${DATE_OR_IDENT})\\s*([+-])\\s*(${DURATION_SRC})$`, 'iu');
const DURATION_DATE = new RegExp(
  `^(${DURATION_SRC})\\s+(after|before)\\s+(${DATE_OR_IDENT})$`,
  'iu'
);
const DURATION_FROM = new RegExp(`^(${DURATION_SRC})\\s+from\\s+(now|today)$`, 'i');
const DURATION_AGO = new RegExp(`^(${DURATION_SRC})\\s+ago$`, 'i');
const DATE_AS = new RegExp(`^(${DATE_SRC})\\s+as\\s+(.+)$`, 'i');
const DAYS_VERB = /^days\s+(until|till|since|between)\s+(.+)$/i;
const INCLUSIVE = new RegExp(
  `^(${DATE_OR_IDENT})\\s+through\\s+(${DATE_OR_IDENT})\\s+in\\s+days?$`,
  'iu'
);
const MIDPOINT = new RegExp(
  `^(?:midpoint|halfway)\\s+between\\s+(${DATE_OR_IDENT})\\s+and\\s+(${DATE_OR_IDENT})$`,
  'iu'
);
const DAYS_IN_MONTH = new RegExp(`^days\\s+in\\s+(${MONTH_YEAR_SRC})$`, 'i');
const DAYS_IN_QUARTER = /^days\s+in\s+Q([1-4])$/i;
const DAY_NUMBER = new RegExp(`^day\\s+(?:number|of\\s+year)\\s+on\\s+(${DATE_OR_IDENT})$`, 'iu');
const DAY_OF_MONTH = new RegExp(`^day\\s+of\\s+month\\s+on\\s+(${DATE_OR_IDENT})$`, 'iu');
const WEEK_NUMBER = new RegExp(`^week\\s+number\\s+on\\s+(${DATE_OR_IDENT})$`, 'iu');
const WEEK_OF_YEAR = /^week\s+of\s+year$/i;
const DATE_AND_DATE = new RegExp(`^(${DATE_OR_IDENT})\\s+and\\s+(${DATE_OR_IDENT})$`, 'iu');
const WORKDAYS_IN = /^workdays\s+in\s+(.+)$/i;
const WORKDAYS_RANGE = new RegExp(
  `^(${DATE_OR_IDENT})\\s+to\\s+(${DATE_OR_IDENT})\\s+in\\s+workdays$`,
  'iu'
);
const WORKDAYS_FROM = new RegExp(
  `^workdays\\s+from\\s+(${DATE_OR_IDENT})\\s+to\\s+(${DATE_OR_IDENT})$`,
  'iu'
);
const ADD_WORKDAYS = new RegExp(`^(${DATE_OR_IDENT})\\s*([+-])\\s*(\\d+)\\s+workdays$`, 'iu');
const WORKDAYS_REL = new RegExp(
  `^(\\d+)\\s+workdays\\s+(after|before)\\s+(${DATE_OR_IDENT})$`,
  'iu'
);
const WEEKDAY_ON = new RegExp(
  `^(?:day\\s+of\\s+the\\s+week|weekday)\\s+on\\s+(${DATE_OR_IDENT})$`,
  'iu'
);
const WORK_HOURS_IN = /^work\s+hours\s+in\s+(.+)$/i;
// `work hours in June [2026]` can appear inside a larger expression (`* 25 EUR`,
// `+ 40`), so it is rewritten wherever it occurs rather than only as a whole
// expression. The anchored form above stays as a fallback for friendlier errors
// on text that is not a month.
const WORK_HOURS_IN_PHRASE = new RegExp(
  `\\bwork\\s+hours\\s+in\\s+(${MONTH_WORD})\\b(?:\\s+(\\d{4}))?`,
  'gi'
);
const WORK_HOURS_BETWEEN = new RegExp(
  `^work\\s+hours\\s+between\\s+(${DATE_OR_IDENT})\\s+and\\s+(${DATE_OR_IDENT})$`,
  'iu'
);

const CLOCK_ONLY = new RegExp(`^(${CLOCK_SRC})$`, 'i');
const CLOCK_DURATION = new RegExp(`^(${CLOCK_SRC})\\s*([+-])\\s*(${DURATION_SRC})$`, 'i');
// A clock pair (`to` is a forward interval, `-` the ambiguous same-day
// difference) can sit inside a larger expression, so it is rewritten wherever
// it occurs and composes with the arithmetic around it
// (`9:00 am to 5:30 pm - 45 minutes`). `now` is a clock operand too, so the time
// until a later clock time (`23:00 - now`) and forward intervals work.
const CLOCK_OPERAND_SRC = `(?:${CLOCK_SRC}|now\\b)`;
const CLOCK_PAIR_PHRASE = new RegExp(
  `\\b(${CLOCK_OPERAND_SRC})\\s+(to|-)\\s+(${CLOCK_OPERAND_SRC})`,
  'gi'
);

// A date argument in a rewritten expression: a date literal becomes
// `__date("...")`, while a variable is passed straight through (it already
// holds a Date).
function dateArg(text) {
  return DATE_LITERAL.test(text) ? `__date(${JSON.stringify(text)})` : text;
}

function preprocessCalendar(expression) {
  let expr = expression.trim().replace(/\bwork\s+days?\b/gi, 'workdays');
  if (!expr) return expression;

  // Rewrite the right-hand side of an assignment too, so a date (or a date
  // arithmetic expression) can be stored in a variable.
  const parsed = parseLine(expr);
  if (parsed.isAssignment) return `${parsed.label} = ${preprocessCalendar(parsed.rhs)}`;

  // Rewrite a `work hours in <month>` phrase wherever it sits, so it composes
  // with the arithmetic around it (`work hours in June * 25 EUR`).
  expr = expr.replace(
    WORK_HOURS_IN_PHRASE,
    (match, month, year) =>
      `__workHoursInMonth(${JSON.stringify(year ? `${month} ${year}` : month)})`
  );

  // A clock pair can sit inside a larger expression too
  // (`9:00 am to 5:30 pm - 45 minutes`); it becomes a duration the rest of the
  // expression combines with.
  expr = expr.replace(
    CLOCK_PAIR_PHRASE,
    (match, a, op, b) =>
      `__clockInterval(${JSON.stringify(a)}, ${JSON.stringify(b)}, ${
        op.toLowerCase() === 'to' ? 1 : 0
      })`
  );

  let m;
  if ((m = DATE_AS.exec(expr))) {
    return `__dateFormat(__date(${JSON.stringify(m[1])}), ${JSON.stringify(m[2])})`;
  }

  // Clock times (`9:45 am`, `16:00`) and their arithmetic.
  if ((m = CLOCK_DURATION.exec(expr))) {
    return `__clockAdd(${JSON.stringify(m[1])}, ${JSON.stringify(m[3])}, ${m[2] === '-' ? -1 : 1})`;
  }
  if ((m = CLOCK_ONLY.exec(expr))) return `__clock(${JSON.stringify(m[1])})`;

  // Weekdays and workdays (public holidays are not modelled yet).
  if ((m = WORKDAYS_RANGE.exec(expr))) {
    return `__workdaysBetween(${dateArg(m[1])}, ${dateArg(m[2])})`;
  }
  if ((m = WORKDAYS_FROM.exec(expr))) {
    return `__workdaysBetween(${dateArg(m[1])}, ${dateArg(m[2])})`;
  }
  if ((m = WORK_HOURS_BETWEEN.exec(expr))) {
    return `__workHoursBetween(${dateArg(m[1])}, ${dateArg(m[2])})`;
  }
  if ((m = ADD_WORKDAYS.exec(expr))) {
    return `__addWorkdays(${dateArg(m[1])}, ${m[2] === '-' ? -1 : 1} * ${m[3]})`;
  }
  if ((m = WORKDAYS_REL.exec(expr))) {
    return `__addWorkdays(${dateArg(m[3])}, ${m[2].toLowerCase() === 'before' ? -1 : 1} * ${m[1]})`;
  }
  if ((m = WORKDAYS_IN.exec(expr))) {
    return `__workdaysInDuration(${JSON.stringify(m[1])})`;
  }
  if ((m = WORK_HOURS_IN.exec(expr))) {
    return `__workHoursInMonth(${JSON.stringify(m[1])})`;
  }
  if ((m = WEEKDAY_ON.exec(expr))) {
    return `__weekday(${dateArg(m[1])})`;
  }

  if ((m = DAYS_VERB.exec(expr))) {
    const verb = m[1].toLowerCase();
    const pair = DATE_AND_DATE.exec(m[2]);
    if (verb === 'between' && pair) {
      return `__daysBetweenText(${dateArg(pair[1])}, ${dateArg(pair[2])})`;
    }
    const single = DATE_ONLY.exec(m[2]) || (IDENT_ONLY.test(m[2]) ? [null, m[2]] : null);
    if (single && verb !== 'between') {
      const arg = dateArg(single[1]);
      return verb === 'since'
        ? `__daysBetweenText(${arg}, "today")`
        : `__daysBetweenText("today", ${arg})`;
    }
  }

  if ((m = INCLUSIVE.exec(expr))) {
    return `__daysBetweenText(${dateArg(m[1])}, ${dateArg(m[2])}, 1)`;
  }

  if ((m = MIDPOINT.exec(expr))) {
    return `__midpointText(${dateArg(m[1])}, ${dateArg(m[2])})`;
  }

  if ((m = DATE_PAIR.exec(expr))) {
    return `__dateInterval(${JSON.stringify(m[1])}, ${JSON.stringify(m[2])})`;
  }

  if ((m = DATE_DURATION.exec(expr))) {
    return `__dateAdd(${dateArg(m[1])}, ${JSON.stringify(m[3])}, ${m[2] === '-' ? -1 : 1})`;
  }

  if ((m = DURATION_DATE.exec(expr))) {
    return `__dateAdd(${dateArg(m[3])}, ${JSON.stringify(m[1])}, ${
      m[2].toLowerCase() === 'before' ? -1 : 1
    })`;
  }

  if ((m = DURATION_FROM.exec(expr))) {
    return `__dateAdd(__date(${JSON.stringify(m[2].toLowerCase())}), ${JSON.stringify(m[1])}, 1)`;
  }

  if ((m = DURATION_AGO.exec(expr))) {
    return `__dateAdd(__date("now"), ${JSON.stringify(m[1])}, -1)`;
  }

  if ((m = DAYS_IN_MONTH.exec(expr))) return `__daysInMonth(${JSON.stringify(m[1])})`;
  if ((m = DAYS_IN_QUARTER.exec(expr))) return `__daysInQuarter(${m[1]})`;
  if ((m = DAY_NUMBER.exec(expr))) return `__dayOfYear(${dateArg(m[1])})`;
  if ((m = DAY_OF_MONTH.exec(expr))) return `__dayOfMonth(${dateArg(m[1])})`;
  if ((m = WEEK_NUMBER.exec(expr))) return `__weekNumber(${dateArg(m[1])})`;
  if (WEEK_OF_YEAR.test(expr)) return `__weekNumber(__date("today"))`;
  if ((m = DATE_ONLY.exec(expr))) return `__date(${JSON.stringify(m[1])})`;

  return expr;
}

export { preprocessCalendar };
