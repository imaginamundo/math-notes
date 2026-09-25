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
// intervals are a small object formatResult renders as `3 weeks 5 days`. Every
// operation goes through a helper, since mathjs has no date type.
//
// This module is the facade that registers the helpers with mathjs. The
// concerns live apart: parsing and primitives in calendarDate.js, formatting in
// calendarFormat.js, arithmetic in calendarArithmetic.js, and the phrase grammar
// in calendarGrammar.js.
import { parseDate, requireDate, requireClock, atNoon, WEEKDAYS } from './calendarDate.js';
import { formatDate, formatInterval, formatDatePattern } from './calendarFormat.js';
import {
  WORKDAY_HOURS,
  dateAdd,
  dateDiff,
  daysBetween,
  daysInMonth,
  daysInQuarter,
  dayOfYear,
  isoWeek,
  workdaysInDuration,
  countWorkdays,
  addWorkdays,
  workHoursInMonth,
  clockAdd,
  clockInterval,
  resolveInterval,
} from './calendarArithmetic.js';
import { preprocessCalendar } from './calendarGrammar.js';

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
      __daysBetweenText: (a, b, extra) => {
        const { a: from, b: to } = resolveInterval(a, b);
        return math.unit(daysBetween(from, to) + (Number(extra) || 0), 'days');
      },
      __daysInMonth: (text) => math.unit(daysInMonth(text), 'days'),
      __daysInQuarter: (value) => math.unit(daysInQuarter(value), 'days'),
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

export { parseDate, dateDiff, formatDate, formatInterval, initCalendar, preprocessCalendar };
export default initCalendar;
