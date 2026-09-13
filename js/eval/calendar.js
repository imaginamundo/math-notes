// Calendar calculations, in the spirit of Soulver's dates & times:
//   10 June + 3 weeks              -> 1 July
//   April 1, 2019 - 3 months 5 days
//   3 weeks after March 14, 2019
//   28 days before March 12
//   today + 3 weeks, 4 days from now, 3 days ago
//   January 10 - February 5        -> 3 weeks 5 days
//   days until Christmas, days since July 15, days between 3 March and 30 May
//   March 12, 2023 as EEEE, MMM d, yyyy
//
// Dates are JS Date objects at local noon (so DST never shifts a day), and
// intervals are a small object formatResult renders as `3 weeks 5 days`.
// Every operation goes through a helper, since mathjs has no date type.

import parseLine from '../core/parseLine.js';

const MONTHS = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DAY_MS = 86400000;

// Fixed-date holidays/observances usable as date names.
const NAMED_DATES = {
  christmas: [12, 25],
  'christmas eve': [12, 24],
  'christmas day': [12, 25],
  'boxing day': [12, 26],
  "new year's eve": [12, 31],
  'new years eve': [12, 31],
  "new year's day": [1, 1],
  'new years day': [1, 1],
  "valentine's day": [2, 14],
  'valentines day': [2, 14],
  halloween: [10, 31],
};

function atNoon(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

function makeDate(year, month, day) {
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

function normalizeYear(year) {
  if (year >= 100) return year;
  return year < 70 ? 2000 + year : 1900 + year;
}

// A date without a year uses the nearest occurrence (this year or next).
function resolveYear(day, month, year, now) {
  if (year !== null) return makeDate(year, month, day);
  const thisYear = makeDate(now.getFullYear(), month, day);
  if (!thisYear) return null;
  const nextYear = makeDate(now.getFullYear() + 1, month, day);
  if (!nextYear) return thisYear;
  return Math.abs(thisYear - now) <= Math.abs(nextYear - now) ? thisYear : nextYear;
}

function parseDate(text, now) {
  const s = String(text).trim().toLowerCase().replace(/\.$/, '');
  if (s === 'today') return atNoon(now);
  if (s === 'now') return new Date(now);
  if (s === 'yesterday') return addDays(atNoon(now), -1);
  if (s === 'tomorrow') return addDays(atNoon(now), 1);
  if (NAMED_DATES[s]) {
    const [month, day] = NAMED_DATES[s];
    return resolveYear(day, month, null, now);
  }

  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return makeDate(+m[1], +m[2], +m[3]);

  m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/.exec(s);
  if (m) return makeDate(normalizeYear(+m[3]), +m[2], +m[1]);

  m = /^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?$/.exec(s);
  if (m && MONTHS[m[1]]) return resolveYear(+m[2], MONTHS[m[1]], m[3] ? +m[3] : null, now);

  m = /^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)(?:,?\s+(\d{4}))?$/.exec(s);
  if (m && MONTHS[m[2]]) return resolveYear(+m[1], MONTHS[m[2]], m[3] ? +m[3] : null, now);

  return null;
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12);
}

// Add months, clamping the day to the target month's length (Jan 31 + 1 month
// is Feb 29 in a leap year).
function addMonths(date, delta) {
  const target = new Date(date.getFullYear(), date.getMonth() + delta, 1, 12);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

function parseDuration(text) {
  const parts = {};
  const re = /(\d+(?:\.\d+)?)\s*(days?|weeks?|months?|years?|hours?|minutes?|seconds?)/gi;
  let m;
  while ((m = re.exec(String(text))) !== null) {
    const unit = m[2].toLowerCase().replace(/s$/, '');
    parts[unit] = (parts[unit] || 0) + Number(m[1]);
  }
  return parts;
}

function applyDuration(date, parts, sign) {
  let result = new Date(date);
  const months = (parts.year || 0) * 12 + (parts.month || 0);
  if (months) result = addMonths(result, sign * months);
  const days = (parts.week || 0) * 7 + (parts.day || 0);
  if (days) result = addDays(result, sign * days);
  const seconds = (parts.hour || 0) * 3600 + (parts.minute || 0) * 60 + (parts.second || 0);
  if (seconds) result = new Date(result.getTime() + sign * seconds * 1000);
  return result;
}

// `__dateAdd` works on whatever the left-hand side turned out to be: a Date
// gets calendar arithmetic, while a duration Unit keeps plain duration
// arithmetic (`x + 30 min`). Anything else is a mistake.
function dateAdd(math, value, duration, sign) {
  const delta = Number(sign) < 0 ? -1 : 1;
  if (value instanceof Date) return applyDuration(value, parseDuration(duration), delta);
  if (value && value.isUnit === true) {
    return math.add(value, math.multiply(delta, durationUnit(math, duration)));
  }
  throw new Error('A duration can only be added to a date or another duration');
}

// Build a mathjs duration Unit from a `2 weeks 3 days` style string.
function durationUnit(math, text) {
  let total = math.unit(0, 's');
  for (const [name, amount] of Object.entries(parseDuration(text))) {
    total = math.add(total, math.unit(amount, name));
  }
  return total;
}

const DIFF_UNITS = [
  ['year', (d) => addMonths(d, 12)],
  ['month', (d) => addMonths(d, 1)],
  ['week', (d) => addDays(d, 7)],
  ['day', (d) => addDays(d, 1)],
];

// The calendar interval from the earlier to the later date, e.g.
// `3 months 3 weeks 6 days`.
function dateDiff(a, b) {
  let start = new Date(a);
  let end = new Date(b);
  if (start > end) [start, end] = [end, start];
  const parts = {};
  for (const [unit, next] of DIFF_UNITS) {
    let count = 0;
    for (;;) {
      const candidate = next(start);
      if (candidate <= end) {
        start = candidate;
        count++;
      } else {
        break;
      }
    }
    if (count) parts[unit] = count;
  }
  return parts;
}

function daysBetween(a, b) {
  return Math.round((atNoon(b) - atNoon(a)) / DAY_MS);
}

function formatDate(date) {
  const year = date.getFullYear();
  const suffix = year === new Date().getFullYear() ? '' : ` ${year}`;
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}${suffix}`;
}

const INTERVAL_ORDER = ['year', 'month', 'week', 'day', 'hour', 'minute', 'second'];

function formatInterval(parts) {
  const out = [];
  for (const unit of INTERVAL_ORDER) {
    const value = parts[unit];
    if (value) out.push(`${value} ${value === 1 ? unit : `${unit}s`}`);
  }
  return out.join(' ') || '0 days';
}

const FORMAT_TOKEN = /yyyy|yy|MMMM|MMM|MM|M|dd|d|EEEE|EEE/g;

function formatDatePattern(date, pattern) {
  return String(pattern).replace(FORMAT_TOKEN, (token) => {
    switch (token) {
      case 'yyyy':
        return String(date.getFullYear());
      case 'yy':
        return String(date.getFullYear()).slice(-2);
      case 'MMMM':
        return MONTH_NAMES[date.getMonth()];
      case 'MMM':
        return MONTH_ABBR[date.getMonth()];
      case 'MM':
        return String(date.getMonth() + 1).padStart(2, '0');
      case 'M':
        return String(date.getMonth() + 1);
      case 'dd':
        return String(date.getDate()).padStart(2, '0');
      case 'd':
        return String(date.getDate());
      case 'EEEE':
        return WEEKDAYS[date.getDay()];
      case 'EEE':
        return WEEKDAY_ABBR[date.getDay()];
      default:
        return token;
    }
  });
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / DAY_MS + 1) / 7);
}

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 1, 12);
  return Math.round((atNoon(date) - start) / DAY_MS) + 1;
}

function requireDate(text) {
  const date = parseDate(text, new Date());
  if (!date) throw new Error(`"${text}" is not a date I understand`);
  return date;
}

// Resolve two dates so the second is not before the first — an interval written
// without years (`3 March to 30 May`) should not straddle a year boundary just
// because the nearest occurrence of one date happens to fall in another year.
function resolveInterval(aText, bText) {
  const a = requireDate(aText);
  let b = requireDate(bText);
  if (b < a) b = addMonths(b, 12);
  return { a, b };
}

function daysInMonth(text) {
  const m = /^([a-z]+)\s+(\d{4})$/i.exec(String(text).trim());
  if (m && MONTHS[m[1].toLowerCase()]) {
    return new Date(+m[2], MONTHS[m[1].toLowerCase()], 0).getDate();
  }
  const date = requireDate(text);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function daysInQuarter(value) {
  const quarter = Math.min(4, Math.max(1, Math.round(Number(value))));
  const year = new Date().getFullYear();
  const start = new Date(year, (quarter - 1) * 3, 1);
  const end = new Date(year, quarter * 3, 1);
  return Math.round((end - start) / DAY_MS);
}

const WORKDAY_HOURS = 8;

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Workdays in the half-open interval [a, b): Saturday and Sunday are skipped.
// Public holidays are not modelled yet.
function countWorkdays(a, b) {
  let start = atNoon(a);
  let end = atNoon(b);
  if (start > end) [start, end] = [end, start];
  let count = 0;
  for (let day = start; day < end; day = addDays(day, 1)) {
    if (!isWeekend(day)) count++;
  }
  return count;
}

// Advance `amount` working days, skipping weekends.
function addWorkdays(date, amount) {
  const step = amount < 0 ? -1 : 1;
  let remaining = Math.abs(Math.round(amount));
  let day = atNoon(date);
  while (remaining > 0) {
    day = addDays(day, step);
    if (!isWeekend(day)) remaining--;
  }
  return day;
}

function workdaysInDuration(text) {
  const parts = parseDuration(text);
  const days =
    (parts.week || 0) * 7 +
    (parts.day || 0) +
    (parts.month || 0) * 30.4375 +
    (parts.year || 0) * 365.2425;
  const start = atNoon(new Date());
  return countWorkdays(start, addDays(start, Math.round(days)));
}

function workHoursInMonth(text) {
  const m = /^([a-z]+)(?:\s+(\d{4}))?$/i.exec(String(text).trim());
  if (!m || !MONTHS[m[1].toLowerCase()]) {
    throw new Error(`"${text}" is not a month I understand`);
  }
  const month = MONTHS[m[1].toLowerCase()];
  const year = m[2] ? +m[2] : new Date().getFullYear();
  return (
    countWorkdays(new Date(year, month - 1, 1, 12), new Date(year, month, 1, 12)) * WORKDAY_HOURS
  );
}

function initCalendar(math) {
  // A workday is eight hours, so `55h in workdays` converts.
  try {
    math.createUnit('workday', { definition: '8 h', aliases: ['workdays'] }, { override: true });
  } catch {
    // already defined
  }
  math.import(
    {
      __date: (text) => requireDate(text),
      __dateAdd: (value, duration, sign) => dateAdd(math, value, duration, sign),
      __dateInterval: (a, b) => {
        const { a: from, b: to } = resolveInterval(a, b);
        return { type: 'calendarInterval', parts: dateDiff(from, to) };
      },
      __dateFormat: (date, pattern) => formatDatePattern(date, pattern),
      __daysBetweenText: (a, b) => {
        const { a: from, b: to } = resolveInterval(a, b);
        return daysBetween(from, to);
      },
      __daysInMonth: (text) => daysInMonth(text),
      __daysInQuarter: (value) => daysInQuarter(value),
      __dayOfMonth: (date) => date.getDate(),
      __dayOfYear: (date) => dayOfYear(date),
      __weekNumber: (date) => isoWeek(date),
      __midpointText: (a, b) => {
        const { a: from, b: to } = resolveInterval(a, b);
        return new Date((atNoon(from).getTime() + atNoon(to).getTime()) / 2);
      },
      __workdaysInDuration: (text) => workdaysInDuration(text),
      __workdaysBetween: (a, b) => {
        const { a: from, b: to } = resolveInterval(a, b);
        return countWorkdays(from, to);
      },
      __addWorkdays: (date, amount) => addWorkdays(date, amount),
      __weekday: (date) => WEEKDAYS[date.getDay()],
      __workHoursInMonth: (text) => workHoursInMonth(text),
      __workHoursBetween: (a, b) => {
        const { a: from, b: to } = resolveInterval(a, b);
        return countWorkdays(from, to) * WORKDAY_HOURS;
      },
    },
    { override: true }
  );
}

const MONTH_WORD = Object.keys(MONTHS).join('|');
const HOLIDAY_WORD =
  "christmas(?:\\s+(?:eve|day))?|boxing\\s+day|new\\s+year'?s?\\s+(?:eve|day)|valentine'?s?\\s+day|halloween";
const DATE_SRC =
  `(?:today|now|yesterday|tomorrow|${HOLIDAY_WORD}` +
  `|(?:${MONTH_WORD})\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?` +
  `|\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTH_WORD})(?:,?\\s+\\d{4})?` +
  `|\\d{4}-\\d{1,2}-\\d{1,2}|\\d{1,2}[./]\\d{1,2}[./]\\d{2,4})`;
const DURATION_SRC = `(?:\\d+(?:\\.\\d+)?\\s*(?:days?|weeks?|months?|years?|hours?|minutes?|seconds?)\\s*)+`;
const MONTH_YEAR_SRC = `(?:${MONTH_WORD})\\s+\\d{4}`;

const DATE_ONLY = new RegExp(`^(${DATE_SRC})$`, 'i');
const DATE_PAIR = new RegExp(`^(${DATE_SRC})\\s*(?:-|to)\\s*(${DATE_SRC})$`, 'i');
const DATE_DURATION = new RegExp(`^(${DATE_SRC})\\s*([+-])\\s*(${DURATION_SRC})$`, 'i');
const DURATION_DATE = new RegExp(`^(${DURATION_SRC})\\s+(after|before)\\s+(${DATE_SRC})$`, 'i');
const DURATION_FROM_NOW = new RegExp(`^(${DURATION_SRC})\\s+from\\s+now$`, 'i');
const DURATION_AGO = new RegExp(`^(${DURATION_SRC})\\s+ago$`, 'i');
const DATE_AS = new RegExp(`^(${DATE_SRC})\\s+as\\s+(.+)$`, 'i');
const DAYS_VERB = /^days\s+(until|till|since|between)\s+(.+)$/i;
const INCLUSIVE = new RegExp(`^(${DATE_SRC})\\s+through\\s+(${DATE_SRC})\\s+in\\s+days?$`, 'i');
const MIDPOINT = new RegExp(
  `^(?:midpoint|halfway)\\s+between\\s+(${DATE_SRC})\\s+and\\s+(${DATE_SRC})$`,
  'i'
);
const DAYS_IN_MONTH = new RegExp(`^days\\s+in\\s+(${MONTH_YEAR_SRC})$`, 'i');
const DAYS_IN_QUARTER = /^days\s+in\s+Q([1-4])$/i;
const DAY_NUMBER = new RegExp(`^day\\s+(?:number|of\\s+year)\\s+on\\s+(${DATE_SRC})$`, 'i');
const DAY_OF_MONTH = new RegExp(`^day\\s+of\\s+month\\s+on\\s+(${DATE_SRC})$`, 'i');
const WEEK_NUMBER = new RegExp(`^week\\s+number\\s+on\\s+(${DATE_SRC})$`, 'i');
const WEEK_OF_YEAR = /^week\s+of\s+year$/i;
const DATE_AND_DATE = new RegExp(`^(${DATE_SRC})\\s+and\\s+(${DATE_SRC})$`, 'i');
const WORKDAYS_IN = /^workdays\s+in\s+(.+)$/i;
const WORKDAYS_RANGE = new RegExp(`^(${DATE_SRC})\\s+to\\s+(${DATE_SRC})\\s+in\\s+workdays$`, 'i');
const WORKDAYS_FROM = new RegExp(`^workdays\\s+from\\s+(${DATE_SRC})\\s+to\\s+(${DATE_SRC})$`, 'i');
const ADD_WORKDAYS = new RegExp(`^(${DATE_SRC})\\s*([+-])\\s*(\\d+)\\s+workdays$`, 'i');
const WORKDAYS_REL = new RegExp(`^(\\d+)\\s+workdays\\s+(after|before)\\s+(${DATE_SRC})$`, 'i');
const WEEKDAY_ON = new RegExp(`^(?:day\\s+of\\s+the\\s+week|weekday)\\s+on\\s+(${DATE_SRC})$`, 'i');
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
  `^work\\s+hours\\s+between\\s+(${DATE_SRC})\\s+and\\s+(${DATE_SRC})$`,
  'i'
);

// A date held in a variable (`start = March 4`, then `start + 2 weeks`). The
// identifier is matched after every literal date pattern, so `today + 1 week`
// still goes through the date path.
const IDENT = '[A-Za-z_][A-Za-z0-9_]*';
const IDENT_DURATION = new RegExp(`^(${IDENT})\\s*([+-])\\s*(${DURATION_SRC})$`, 'i');
const DURATION_IDENT = new RegExp(`^(${DURATION_SRC})\\s+(after|before)\\s+(${IDENT})$`, 'i');

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

  let m;
  if ((m = DATE_AS.exec(expr))) {
    return `__dateFormat(__date(${JSON.stringify(m[1])}), ${JSON.stringify(m[2])})`;
  }

  // Weekdays and workdays (public holidays are not modelled yet).
  if ((m = WORKDAYS_RANGE.exec(expr))) {
    return `__workdaysBetween(${JSON.stringify(m[1])}, ${JSON.stringify(m[2])})`;
  }
  if ((m = WORKDAYS_FROM.exec(expr))) {
    return `__workdaysBetween(${JSON.stringify(m[1])}, ${JSON.stringify(m[2])})`;
  }
  if ((m = WORK_HOURS_BETWEEN.exec(expr))) {
    return `__workHoursBetween(${JSON.stringify(m[1])}, ${JSON.stringify(m[2])})`;
  }
  if ((m = ADD_WORKDAYS.exec(expr))) {
    return `__addWorkdays(__date(${JSON.stringify(m[1])}), ${m[2] === '-' ? -1 : 1} * ${m[3]})`;
  }
  if ((m = WORKDAYS_REL.exec(expr))) {
    return `__addWorkdays(__date(${JSON.stringify(m[3])}), ${
      m[2].toLowerCase() === 'before' ? -1 : 1
    } * ${m[1]})`;
  }
  if ((m = WORKDAYS_IN.exec(expr))) {
    return `__workdaysInDuration(${JSON.stringify(m[1])})`;
  }
  if ((m = WORK_HOURS_IN.exec(expr))) {
    return `__workHoursInMonth(${JSON.stringify(m[1])})`;
  }
  if ((m = WEEKDAY_ON.exec(expr))) {
    return `__weekday(__date(${JSON.stringify(m[1])}))`;
  }

  if ((m = DAYS_VERB.exec(expr))) {
    const verb = m[1].toLowerCase();
    const pair = DATE_AND_DATE.exec(m[2]);
    if (verb === 'between' && pair) {
      return `__daysBetweenText(${JSON.stringify(pair[1])}, ${JSON.stringify(pair[2])})`;
    }
    const single = DATE_ONLY.exec(m[2]);
    if (single && verb !== 'between') {
      return verb === 'since'
        ? `__daysBetweenText(${JSON.stringify(single[1])}, "today")`
        : `__daysBetweenText("today", ${JSON.stringify(single[1])})`;
    }
  }

  if ((m = INCLUSIVE.exec(expr))) {
    return `__daysBetweenText(${JSON.stringify(m[1])}, ${JSON.stringify(m[2])}) + 1`;
  }

  if ((m = MIDPOINT.exec(expr))) {
    return `__midpointText(${JSON.stringify(m[1])}, ${JSON.stringify(m[2])})`;
  }

  if ((m = DATE_PAIR.exec(expr))) {
    return `__dateInterval(${JSON.stringify(m[1])}, ${JSON.stringify(m[2])})`;
  }

  if ((m = DATE_DURATION.exec(expr))) {
    return `__dateAdd(__date(${JSON.stringify(m[1])}), ${JSON.stringify(m[3])}, ${
      m[2] === '-' ? -1 : 1
    })`;
  }

  if ((m = DURATION_DATE.exec(expr))) {
    return `__dateAdd(__date(${JSON.stringify(m[3])}), ${JSON.stringify(m[1])}, ${
      m[2].toLowerCase() === 'before' ? -1 : 1
    })`;
  }

  if ((m = IDENT_DURATION.exec(expr))) {
    return `__dateAdd(${m[1]}, ${JSON.stringify(m[3])}, ${m[2] === '-' ? -1 : 1})`;
  }

  if ((m = DURATION_IDENT.exec(expr))) {
    return `__dateAdd(${m[3]}, ${JSON.stringify(m[1])}, ${
      m[2].toLowerCase() === 'before' ? -1 : 1
    })`;
  }

  if ((m = DURATION_FROM_NOW.exec(expr))) {
    return `__dateAdd(__date("now"), ${JSON.stringify(m[1])}, 1)`;
  }

  if ((m = DURATION_AGO.exec(expr))) {
    return `__dateAdd(__date("now"), ${JSON.stringify(m[1])}, -1)`;
  }

  if ((m = DAYS_IN_MONTH.exec(expr))) return `__daysInMonth(${JSON.stringify(m[1])})`;
  if ((m = DAYS_IN_QUARTER.exec(expr))) return `__daysInQuarter(${m[1]})`;
  if ((m = DAY_NUMBER.exec(expr))) return `__dayOfYear(__date(${JSON.stringify(m[1])}))`;
  if ((m = DAY_OF_MONTH.exec(expr))) return `__dayOfMonth(__date(${JSON.stringify(m[1])}))`;
  if ((m = WEEK_NUMBER.exec(expr))) return `__weekNumber(__date(${JSON.stringify(m[1])}))`;
  if (WEEK_OF_YEAR.test(expr)) return `__weekNumber(__date("today"))`;
  if ((m = DATE_ONLY.exec(expr))) return `__date(${JSON.stringify(m[1])})`;

  return expr;
}

export { parseDate, dateDiff, formatDate, formatInterval, initCalendar, preprocessCalendar };
export default initCalendar;
