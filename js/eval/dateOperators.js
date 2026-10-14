// Dates as operands. mathjs does not add or subtract a Date, so a date held in a
// variable, a chain (`start + 2 weeks + 3 days`) or a date inside a longer expression
// reached it as a raw type error. These typed overloads give `+` and `-` the
// calendar meaning wherever the operands turn out to be a Date and a duration.
import { applyDuration, dateDiff, daysBetween } from './calendarArithmetic.js';
import { markClock } from './calendarDate.js';
import { atNoon } from './calendarDate.js';

const SINGLE = /^(year|month|week|day|hour|minute|second)s?$/;

// The parts `applyDuration` takes, from a duration Unit. A month or a year is a
// calendar step; anything else is a length of time, taken in whole days when it is one
// (so `start + gap` with `gap = 3 days` lands on a date, not on a time of day).
function durationParts(unit) {
  const name = SINGLE.exec(unit.formatUnits());
  if (name) return { [name[1]]: unit.toNumber(name[1]) };
  const seconds = unit.toNumber('s');
  if (Number.isInteger(seconds / 86400)) return { day: seconds / 86400 };
  return { second: seconds };
}

function addDuration(date, unit, sign) {
  if (!unit.equalBase(unit.constructor.parse('1 s'))) {
    throw new Error('Only a duration can be added to a date');
  }
  return markClock(applyDuration(date, durationParts(unit), sign), date.clock === true);
}

// The interval between two dates as a days Unit that also carries the calendar parts
// it is shown with (`2 months 6 days`), so it can be summed, scaled and converted like any
// duration. It is the size of the gap, the same in either order.
function intervalUnit(math, from, to) {
  const unit = math.unit(Math.abs(daysBetween(atNoon(from), atNoon(to))), 'days');
  unit.timespan = true;
  unit.calendarParts = dateDiff(from, to);
  return unit;
}

function clockSpan(math, a, b) {
  const unit = math.unit(Math.round(Math.abs(b - a) / 60000), 'minutes');
  unit.timespan = true;
  return unit;
}

function initDateOperators(math) {
  const typed = math.typed;
  math.import(
    {
      add: typed('add', {
        'Date, Unit': (date, unit) => addDuration(date, unit, 1),
        'Unit, Date': (unit, date) => addDuration(date, unit, 1),
      }),
      subtract: typed('subtract', {
        'Date, Unit': (date, unit) => addDuration(date, unit, -1),
        'Date, Date': (a, b) =>
          a.clock === true && b.clock === true ? clockSpan(math, a, b) : intervalUnit(math, a, b),
      }),
    },
    { override: false }
  );
  return { intervalUnit };
}

export { initDateOperators, intervalUnit };
export default initDateOperators;
