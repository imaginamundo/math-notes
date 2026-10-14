// Date, clock and workday arithmetic. Everything works on the plain Date
// primitives from calendarDate.js; mathjs only enters through the `math`
// argument for duration Units.
import { currentTime } from './clock.js';
import {
  MONTHS,
  MONTH_NAMES,
  DAY_MS,
  atNoon,
  addDays,
  addMonths,
  occurrenceAround,
  shiftDays,
  shiftMonths,
  startOfDay,
  parseDuration,
  parseDurationExact,
  requireClock,
  requireDate,
  markClock,
  toDate,
} from './calendarDate.js';

// Month and year lengths used for the fractional part of a count (`1.5 months`),
// matching the timespan display.
const MONTH_DAYS = 30.4375;

// Add a duration to a date. Whole months and days move the calendar and keep the
// time of day; the fractions and the hours, minutes and seconds are elapsed time.
// A plain date measures sub-day time from the start of its day and so becomes a
// clock time (`today + 12 hours` is 12:00), instead of carrying a hidden noon.
function applyDuration(date, parts, sign) {
  const months = (parts.year || 0) * 12 + (parts.month || 0);
  const wholeMonths = Math.trunc(months);
  const days = (parts.week || 0) * 7 + (parts.day || 0) + (months - wholeMonths) * MONTH_DAYS;
  const wholeDays = Math.trunc(days);
  const elapsed =
    (days - wholeDays) * 86400 +
    (parts.hour || 0) * 3600 +
    (parts.minute || 0) * 60 +
    (parts.second || 0);
  const subDay = elapsed !== 0;

  let result = date.clock || !subDay ? new Date(date) : startOfDay(date);
  if (wholeMonths) result = shiftMonths(result, sign * wholeMonths);
  if (wholeDays) result = shiftDays(result, sign * wholeDays);
  if (subDay) {
    result = new Date(result.getTime() + sign * elapsed * 1000);
    result.clock = true;
  }
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

// The calendar interval from the earlier to the later date, e.g.
// `3 months 3 weeks 6 days`. Whole months are counted from the original start, not
// by stepping month to month, because a step from the 31st clamps to a shorter
// month and the lost days would come back as extra days: `Jan 31 to Mar 31` is
// 2 months, and start + interval is always the end.
function dateDiff(a, b) {
  let start = atNoon(a);
  let end = atNoon(b);
  if (start > end) [start, end] = [end, start];
  let months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  while (months > 0 && addMonths(start, months) > end) months--;
  const parts = {};
  if (Math.floor(months / 12)) parts.year = Math.floor(months / 12);
  if (months % 12) parts.month = months % 12;
  const days = daysBetween(addMonths(start, months), end);
  if (Math.floor(days / 7)) parts.week = Math.floor(days / 7);
  if (days % 7) parts.day = days % 7;
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
  const year = currentTime().getFullYear();
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
  const year = m[2] ? +m[2] : currentTime().getFullYear();
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
  const now = currentTime();
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
  // Only a period or a plain run of number-and-unit pairs: `3 weeks - 1 week` or
  // `3 weeks * 25 EUR` is not one, and used to be read as the pairs it contained.
  const parts = parseDurationExact(text);
  if (!parts) throw new Error(`"${text}" is not a period I understand`);
  const days =
    (parts.week || 0) * 7 +
    (parts.day || 0) +
    (parts.month || 0) * 30.4375 +
    (parts.year || 0) * 365.2425;
  const start = atNoon(currentTime());
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

// Place the yearless end of an interval. A date written without a year has no year of
// its own, so it takes one from the other end when that has one, and from the nearest
// occurrence when neither does.
//   `forward` (`to`, `through`, `since`, `until`): reads from the first date to the second,
//     so a yearless first date is the latest occurrence on or before the second, and a
//     yearless second date the earliest on or after the first (`days since March 1`,
//     `today to Christmas`). Two yearless dates wrap forward (`Dec 1 to Feb 5`).
//   `span` (`-`, `between`, `midpoint`): the size of the gap, the same in either order,
//     so a yearless date is the latest occurrence on or before the dated end, and two
//     yearless dates are the smaller gap between their month-days, wherever the year turns.
// A backward interval with years (`2020-06-01 - 2019-01-01`) keeps its real span;
// `dateDiff` swaps the endpoints.
// The occurrence of a yearless date closest to another date.
function nearestTo(date, other) {
  const before = occurrenceAround(date, other, 'before');
  const after = occurrenceAround(date, other, 'after');
  return Math.abs(other - before) <= Math.abs(after - other) ? before : after;
}

function resolveInterval(aValue, bValue, mode = 'forward') {
  let a = toDate(aValue);
  let b = toDate(bValue);
  const aYearless = a.implicitYear === true;
  const bYearless = b.implicitYear === true;
  if (aYearless && !bYearless) {
    a = occurrenceAround(a, b, 'before');
  } else if (!aYearless && bYearless) {
    b = occurrenceAround(b, a, mode === 'forward' ? 'after' : 'before');
  } else if (aYearless && bYearless) {
    // Forward wraps (`Dec 1 to Feb 5`); a span takes the year of the second date that
    // puts it closest to the first (`Mar 3 and May 30` are in one year, `Dec 25 and
    // Jan 5` straddle two).
    b = mode === 'forward' ? (b < a ? occurrenceAround(b, a, 'after') : b) : nearestTo(b, a);
  }
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
