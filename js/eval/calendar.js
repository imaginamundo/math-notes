// Calendar calculations, in the spirit of Soulver's dates & times:
//   10 June + 3 weeks              -> 1 July
//   April 1, 2019 - 3 months 5 days
//   3 weeks after March 14, 2019
//   28 days before March 12
//   today + 3 weeks, 4 days from now, 2 weeks from today, 3 days ago
//   January 10 - February 5        -> 3 weeks 5 days
//   days until Christmas, days since July 15, days between 3 March and 30 May
//   March 12, 2023 as EEEE, MMM d, yyyy
//
// Dates are JS Date objects at local noon (so DST never shifts a day), and
// intervals are a small object formatResult renders as `3 weeks 5 days`.
// Every operation goes through a helper, since mathjs has no date type.

import parseLine from '../core/parseLine.js';
import { getClockFormat } from '../core/clockFormat.js';

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
  if (s === 'now') return markClock(new Date(now));
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

// A clock time is today's date at the given time of day, marked so formatResult
// renders it as a time (`6:26 pm`) rather than a date.
function markClock(date, flag = true) {
  if (flag) date.clock = true;
  return date;
}

function parseClock(text, now) {
  const s = String(text).trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  if (s === 'now') return markClock(new Date(now));
  let m = /^(\d{1,2}):(\d{2}) ?([ap])m$/.exec(s);
  if (m) return markClock(clockAt(now, to24(+m[1], m[3]), +m[2]));
  m = /^(\d{1,2}) ?([ap])m$/.exec(s);
  if (m) return markClock(clockAt(now, to24(+m[1], m[2]), 0));
  m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (m && +m[1] <= 23 && +m[2] <= 59) return markClock(clockAt(now, +m[1], +m[2]));
  return null;
}

function clockAt(now, hour, minute) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
}

function to24(hour, mer) {
  const h = hour % 12;
  return mer === 'p' ? h + 12 : h;
}

function requireClock(text) {
  const clock = parseClock(text, new Date());
  if (!clock) throw new Error(`"${text}" is not a clock time I understand`);
  return clock;
}

function clockAdd(text, duration, sign) {
  const clock = requireClock(text);
  return markClock(applyDuration(clock, parseDuration(duration), Number(sign) < 0 ? -1 : 1));
}

// The interval between two clock times as a timespan Unit, so it can be added,
// subtracted and aggregated like any other duration. A `to` interval runs
// forward, wrapping past midnight when needed (`4pm to 3am` is 11 hours); a `-`
// interval keeps both on the same day (`4pm - 3am` is 13 hours), matching
// Soulver's ambiguity rule.
function clockInterval(aText, bText, forward, math) {
  const a = requireClock(aText);
  const b = requireClock(bText);
  if (forward && b <= a) {
    b.setDate(b.getDate() + 1);
  }
  // Minutes (not seconds) so that arithmetic keeps a unit formatResult draws as
  // a timespan, rather than falling back to raw seconds.
  const unit = math.unit(Math.round(Math.abs(b - a) / 60000), 'minutes');
  unit.timespan = true;
  return unit;
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

// Every duration unit word maps to its canonical singular name, so `4h 3m 5s`
// and `4 hours 3 minutes 5 seconds` parse the same. `m` is minutes (as in the
// timespan syntax); months are `mo`/`month`.
const DURATION_UNITS = {
  d: 'day',
  day: 'day',
  days: 'day',
  w: 'week',
  week: 'week',
  weeks: 'week',
  mo: 'month',
  month: 'month',
  months: 'month',
  y: 'year',
  year: 'year',
  years: 'year',
  h: 'hour',
  hr: 'hour',
  hrs: 'hour',
  hour: 'hour',
  hours: 'hour',
  m: 'minute',
  min: 'minute',
  mins: 'minute',
  minute: 'minute',
  minutes: 'minute',
  s: 'second',
  sec: 'second',
  secs: 'second',
  second: 'second',
  seconds: 'second',
};

function parseDuration(text) {
  const parts = {};
  const re = /(\d+(?:\.\d+)?)\s*([a-z]+)/gi;
  let m;
  while ((m = re.exec(String(text))) !== null) {
    const unit = DURATION_UNITS[m[2].toLowerCase()];
    if (!unit) continue;
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
  if (value instanceof Date) {
    // `now` is a clock time, so its arithmetic stays one (`now + 3 hours`).
    return markClock(applyDuration(value, parseDuration(duration), delta), value.clock === true);
  }
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
  if (date.clock) return formatClock(date);
  const year = date.getFullYear();
  const suffix = year === new Date().getFullYear() ? '' : ` ${year}`;
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}${suffix}`;
}

// `19:12` or `7:12 pm` (per the Clock setting), with the day when the clock
// time is not today.
function formatClock(date, now = new Date()) {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const time =
    getClockFormat() === '12'
      ? `${hours % 12 === 0 ? 12 : hours % 12}:${minutes} ${hours < 12 ? 'am' : 'pm'}`
      : `${String(hours).padStart(2, '0')}:${minutes}`;
  const day = Math.round((atNoon(date) - atNoon(now)) / DAY_MS);
  if (day === 0) return time;
  if (day === -1) return `Yesterday at ${time}`;
  if (day === 1) return `Tomorrow at ${time}`;
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} at ${time}`;
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

// A date argument in a rewritten expression: a date literal becomes
// `__date("...")`, while a variable is passed straight through (it already
// holds a Date).
function dateArg(text) {
  return DATE_LITERAL.test(text) ? `__date(${JSON.stringify(text)})` : text;
}

// Accept either a Date value (a date variable) or date text.
function toDate(value) {
  return value instanceof Date ? value : requireDate(value);
}

// Resolve two dates so the second is not before the first — an interval written
// without years (`3 March to 30 May`) should not straddle a year boundary just
// because the nearest occurrence of one date happens to fall in another year.
function resolveInterval(aValue, bValue) {
  const a = toDate(aValue);
  let b = toDate(bValue);
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

function workdaysInMonth(text) {
  const m = /^([a-z]+)(?:\s+(\d{4}))?$/i.exec(String(text).trim());
  if (!m || !MONTHS[m[1].toLowerCase()]) {
    throw new Error(`"${text}" is not a month I understand`);
  }
  const month = MONTHS[m[1].toLowerCase()];
  const year = m[2] ? +m[2] : new Date().getFullYear();
  return countWorkdays(new Date(year, month - 1, 1, 12), new Date(year, month, 1, 12));
}

function workdaysInYear(year) {
  return countWorkdays(new Date(year, 0, 1, 12), new Date(year + 1, 0, 1, 12));
}

// `.workdays in X` names either a calendar period (`June`, `June 2026`, `2026`,
// `this month`) or a duration from today (`3 weeks`). Returns null for a
// duration so the caller can fall back.
function workdaysInPeriod(text) {
  const s = String(text).trim();
  const now = new Date();
  if (/^this\s+month$/i.test(s)) {
    return workdaysInMonth(`${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`);
  }
  if (/^this\s+year$/i.test(s)) return workdaysInYear(now.getFullYear());
  const month = /^([a-z]+)(?:\s+(\d{4}))?$/i.exec(s);
  if (month && MONTHS[month[1].toLowerCase()]) return workdaysInMonth(s);
  const year = /^(\d{4})$/.exec(s);
  if (year) return workdaysInYear(+year[1]);
  return null;
}

function workdaysInDuration(text) {
  const period = workdaysInPeriod(text);
  if (period !== null) return period;
  const parts = parseDuration(text);
  if (!Object.keys(parts).length) {
    throw new Error(`"${text}" is not a period I understand`);
  }
  const days =
    (parts.week || 0) * 7 +
    (parts.day || 0) +
    (parts.month || 0) * 30.4375 +
    (parts.year || 0) * 365.2425;
  const start = atNoon(new Date());
  return countWorkdays(start, addDays(start, Math.round(days)));
}

function workHoursInMonth(text) {
  return workdaysInMonth(text) * WORKDAY_HOURS;
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
      __clock: (text) => requireClock(text),
      __clockAdd: (text, duration, sign) => clockAdd(text, duration, sign),
      __clockInterval: (a, b, forward) => clockInterval(a, b, Number(forward) > 0, math),
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
// A date, or a variable that holds one (`start = March 4`, then `start + 2 weeks`).
const IDENT = '[A-Za-z_][A-Za-z0-9_]*';
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
const IDENT_ONLY = new RegExp(`^${IDENT}$`);
const DATE_PAIR = new RegExp(`^(${DATE_SRC})\\s*(?:-|to)\\s*(${DATE_SRC})$`, 'i');
const DATE_DURATION = new RegExp(`^(${DATE_OR_IDENT})\\s*([+-])\\s*(${DURATION_SRC})$`, 'i');
const DURATION_DATE = new RegExp(
  `^(${DURATION_SRC})\\s+(after|before)\\s+(${DATE_OR_IDENT})$`,
  'i'
);
const DURATION_FROM = new RegExp(`^(${DURATION_SRC})\\s+from\\s+(now|today)$`, 'i');
const DURATION_AGO = new RegExp(`^(${DURATION_SRC})\\s+ago$`, 'i');
const DATE_AS = new RegExp(`^(${DATE_SRC})\\s+as\\s+(.+)$`, 'i');
const DAYS_VERB = /^days\s+(until|till|since|between)\s+(.+)$/i;
const INCLUSIVE = new RegExp(
  `^(${DATE_OR_IDENT})\\s+through\\s+(${DATE_OR_IDENT})\\s+in\\s+days?$`,
  'i'
);
const MIDPOINT = new RegExp(
  `^(?:midpoint|halfway)\\s+between\\s+(${DATE_OR_IDENT})\\s+and\\s+(${DATE_OR_IDENT})$`,
  'i'
);
const DAYS_IN_MONTH = new RegExp(`^days\\s+in\\s+(${MONTH_YEAR_SRC})$`, 'i');
const DAYS_IN_QUARTER = /^days\s+in\s+Q([1-4])$/i;
const DAY_NUMBER = new RegExp(`^day\\s+(?:number|of\\s+year)\\s+on\\s+(${DATE_OR_IDENT})$`, 'i');
const DAY_OF_MONTH = new RegExp(`^day\\s+of\\s+month\\s+on\\s+(${DATE_OR_IDENT})$`, 'i');
const WEEK_NUMBER = new RegExp(`^week\\s+number\\s+on\\s+(${DATE_OR_IDENT})$`, 'i');
const WEEK_OF_YEAR = /^week\s+of\s+year$/i;
const DATE_AND_DATE = new RegExp(`^(${DATE_OR_IDENT})\\s+and\\s+(${DATE_OR_IDENT})$`, 'i');
const WORKDAYS_IN = /^workdays\s+in\s+(.+)$/i;
const WORKDAYS_RANGE = new RegExp(
  `^(${DATE_OR_IDENT})\\s+to\\s+(${DATE_OR_IDENT})\\s+in\\s+workdays$`,
  'i'
);
const WORKDAYS_FROM = new RegExp(
  `^workdays\\s+from\\s+(${DATE_OR_IDENT})\\s+to\\s+(${DATE_OR_IDENT})$`,
  'i'
);
const ADD_WORKDAYS = new RegExp(`^(${DATE_OR_IDENT})\\s*([+-])\\s*(\\d+)\\s+workdays$`, 'i');
const WORKDAYS_REL = new RegExp(
  `^(\\d+)\\s+workdays\\s+(after|before)\\s+(${DATE_OR_IDENT})$`,
  'i'
);
const WEEKDAY_ON = new RegExp(
  `^(?:day\\s+of\\s+the\\s+week|weekday)\\s+on\\s+(${DATE_OR_IDENT})$`,
  'i'
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
  'i'
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
    return `__daysBetweenText(${dateArg(m[1])}, ${dateArg(m[2])}) + 1`;
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

export { parseDate, dateDiff, formatDate, formatInterval, initCalendar, preprocessCalendar };
export default initCalendar;
