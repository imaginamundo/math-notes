// Date primitives shared by the calendar modules: the month/weekday tables, the
// duration vocabulary, and parsers for dates, clock times and `2 weeks 3 days`
// durations. Pure (no mathjs), so formatting, arithmetic and the grammar can
// share it without a cycle.

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
  const resolved = Math.abs(thisYear - now) <= Math.abs(nextYear - now) ? thisYear : nextYear;
  // Remember that the year was implicit: only those dates may be nudged onto
  // the other side of the later date when the interval has no year to place it.
  resolved.implicitYear = true;
  return resolved;
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
  const re = /(\d+(?:\.\d+)?)\s*([a-z]+)/gi;
  let m;
  while ((m = re.exec(String(text))) !== null) {
    const unit = DURATION_UNITS[m[2].toLowerCase()];
    if (!unit) continue;
    parts[unit] = (parts[unit] || 0) + Number(m[1]);
  }
  return parts;
}

function requireDate(text) {
  const date = parseDate(text, new Date());
  if (!date) throw new Error(`"${text}" is not a date I understand`);
  return date;
}

// Accept either a Date value (a date variable) or date text.
function toDate(value) {
  return value instanceof Date ? value : requireDate(value);
}

export {
  MONTHS,
  MONTH_NAMES,
  MONTH_ABBR,
  WEEKDAYS,
  WEEKDAY_ABBR,
  DAY_MS,
  NAMED_DATES,
  DURATION_UNITS,
  atNoon,
  makeDate,
  normalizeYear,
  resolveYear,
  parseDate,
  markClock,
  parseClock,
  clockAt,
  to24,
  requireClock,
  requireDate,
  addDays,
  addMonths,
  parseDuration,
  toDate,
};
