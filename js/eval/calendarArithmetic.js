// Date, clock and workday arithmetic. Everything works on the plain Date
// primitives from calendarDate.js; mathjs only enters through the `math`
// argument for duration Units.
import {
  MONTHS,
  MONTH_NAMES,
  DAY_MS,
  atNoon,
  addDays,
  addMonths,
  parseDuration,
  requireClock,
  requireDate,
  markClock,
  toDate,
} from './calendarDate.js';

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

// Resolve two dates so the second is not before the first — but only when the
// second date's year was implicit (a `3 March to 30 May` written without years,
// where the nearest occurrence of one date happens to fall after the other). An
// explicit backward interval (`2020-06-01 - 2019-01-01`) keeps its real span and
// `dateDiff` swaps the endpoints instead of dropping a whole year.
function resolveInterval(aValue, bValue) {
  const a = toDate(aValue);
  let b = toDate(bValue);
  if (b < a && b.implicitYear === true) b = addMonths(b, 12);
  return { a, b };
}

export {
  WORKDAY_HOURS,
  dateAdd,
  dateDiff,
  daysBetween,
  daysInMonth,
  daysInQuarter,
  isoWeek,
  dayOfYear,
  countWorkdays,
  addWorkdays,
  workdaysInDuration,
  workHoursInMonth,
  clockAdd,
  clockInterval,
  resolveInterval,
};
