import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLines } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';
import { preprocessCalendar } from '../js/eval/calendar.js';
import { DEFAULT_CLOCK_FORMAT, setClockFormat } from '../js/core/clockFormat.js';

function valueOf(line) {
  return formatResult(evaluateLines([line]).results[0].value);
}

test('preprocessCalendar rewrites date arithmetic and intervals', () => {
  assert.equal(
    preprocessCalendar('10 June + 3 weeks'),
    '__dateAdd(__date("10 June"), "3 weeks", 1)'
  );
  assert.equal(
    preprocessCalendar('January 10 - February 5'),
    '__dateInterval("January 10", "February 5")'
  );
  assert.equal(
    preprocessCalendar('days until Christmas'),
    '__daysBetweenText("today", __date("Christmas"))'
  );
});

test('preprocessCalendar leaves ordinary expressions alone', () => {
  assert.equal(preprocessCalendar('1 cm to m'), '1 cm to m');
  assert.equal(preprocessCalendar('2 + 2'), '2 + 2');
  assert.equal(preprocessCalendar('1 month in days'), '1 month in days');
  assert.equal(preprocessCalendar('5.5 minutes as timespan'), '5.5 minutes as timespan');
});

test('adding and subtracting durations from a date', () => {
  assert.equal(valueOf('April 1, 2019 - 3 months 5 days'), '27 December 2018');
  assert.equal(valueOf('12/02/1988 + 32 years'), '12 February 2020');
  assert.equal(valueOf('01.05.2005 + 3 years 2 months 3 weeks'), '22 July 2008');
  assert.equal(valueOf('3 weeks after March 14, 2019'), '4 April 2019');
  assert.equal(valueOf('Jan 31 2020 + 1 month'), '29 February 2020');
  assert.equal(valueOf('2019-04-01'), '1 April 2019');
});

test('a date can be stored in a variable and reused', () => {
  assert.equal(preprocessCalendar('start = March 4, 2025'), 'start = __date("March 4, 2025")');
  assert.equal(preprocessCalendar('start + 2 weeks'), '__dateAdd(start, "2 weeks", 1)');
  assert.equal(preprocessCalendar('2 weeks after start'), '__dateAdd(start, "2 weeks", 1)');

  const { results } = evaluateLines([
    'start = March 4, 2025',
    'start',
    'start + 2 weeks',
    'deadline = March 4, 2025 + 6 weeks',
    'deadline',
  ]);
  assert.equal(formatResult(results[1].value), '4 March 2025');
  assert.equal(formatResult(results[2].value), '18 March 2025');
  assert.equal(formatResult(results[4].value), '15 April 2025');
});

test('adding a duration to a duration variable still adds durations', () => {
  const { results } = evaluateLines(['span = 2 hours', 'span + 30 minutes']);
  assert.equal(formatResult(results[1].value), '2 hours 30 minutes');
});

test('the interval between two dates', () => {
  assert.equal(valueOf('January 10 - February 5'), '3 weeks 5 days');
  assert.equal(valueOf('3 March to 30 May'), '2 months 3 weeks 6 days');
  assert.equal(valueOf('April 1 through April 30 in days'), '30');
});

test('an explicit backward interval keeps its full span', () => {
  assert.equal(valueOf('2020-06-01 - 2019-01-01'), '1 year 5 months');
  assert.equal(valueOf('2021-06-01 - 2019-01-01'), '2 years 5 months');
  // Both directions agree; an explicit year is never nudged.
  assert.equal(valueOf('2019-01-01 - 2020-06-01'), '1 year 5 months');
});

test('days until, since and between', () => {
  assert.equal(valueOf('days between 3 March and 30 May'), '88');
});

test('date parts, week numbers and formatting', () => {
  assert.equal(valueOf('days in February 2020'), '29');
  assert.equal(valueOf('days in Q3'), '92');
  assert.equal(valueOf('day number on March 15, 2024'), '75');
  assert.equal(valueOf('day of month on March 15, 2024'), '15');
  assert.equal(valueOf('week number on march 12, 2021'), '10');
  assert.equal(valueOf('March 12, 2023 as EEEE, MMM d, yyyy'), 'Sunday, Mar 12, 2023');
});

test('workdays skip weekends', () => {
  assert.equal(valueOf('workdays in 3 weeks'), '15');
  assert.equal(valueOf('10 March to 17 March in workdays'), '5');
  assert.equal(valueOf('55h in workdays'), '6.875 workdays');
  assert.equal(valueOf('55h in work days'), '6.875 workdays');
});

test('workdays in a calendar period', () => {
  assert.equal(valueOf('workdays in March 2026'), '22');
  assert.equal(valueOf('workdays in June 2026'), '22');
  assert.equal(valueOf('workdays in 2026'), '261');
  assert.equal(valueOf('workdays in 2020'), '262');

  const now = new Date();
  assert.equal(valueOf('workdays in this year'), valueOf(`workdays in ${now.getFullYear()}`));
  const monthName = new Intl.DateTimeFormat('en', { month: 'long' }).format(now);
  assert.equal(valueOf('workdays in this month'), valueOf(`workdays in ${monthName}`));
});

test('workdays in unrecognised text is an error, not zero', () => {
  const { results } = evaluateLines(['workdays in banana']);
  assert.equal(results[0].type, 'error');
  assert.match(results[0].value, /not a period/);
});

test('adding and subtracting workdays', () => {
  assert.equal(valueOf('5 workdays after March 14, 2019'), '21 March 2019');
  assert.equal(valueOf('3 workdays before March 14, 2019'), '11 March 2019');
});

test('work hours assume an eight-hour workday', () => {
  assert.equal(valueOf('work hours in June 2026'), '176');
});

test('work hours compose with the arithmetic around them', () => {
  assert.equal(
    preprocessCalendar('work hours in June * 25 EUR'),
    '__workHoursInMonth("June") * 25 EUR'
  );
  const { results } = evaluateLines(['work hours in June 2026 * 2']);
  assert.equal(results[0].value, 352);
});

test('the weekday of a date', () => {
  assert.equal(valueOf('day of the week on January 24, 1984'), 'Tuesday');
  assert.equal(valueOf('weekday on March 9, 2024'), 'Saturday');
});

test('clock times parse and render (24-hour by default)', () => {
  assert.equal(valueOf('9:45 am'), '09:45');
  assert.equal(valueOf('4pm'), '16:00');
  assert.equal(valueOf('16:00'), '16:00');
  assert.equal(valueOf('1:30'), '01:30');
  assert.equal(valueOf('12pm'), '12:00');
  assert.equal(valueOf('12am'), '00:00');
});

test('the Clock setting switches to 12-hour', () => {
  setClockFormat('12');
  try {
    assert.equal(valueOf('9:45 am'), '9:45 am');
    assert.equal(valueOf('16:00 + 3 hours 12 minutes'), '7:12 pm');
  } finally {
    setClockFormat(DEFAULT_CLOCK_FORMAT);
  }
});

test('adding and subtracting a duration from a clock time', () => {
  assert.equal(valueOf('16:00 + 3 hours 12 minutes'), '19:12');
  assert.equal(
    preprocessCalendar('9:45 am - 15 hours 10 minutes'),
    '__clockAdd("9:45 am", "15 hours 10 minutes", -1)'
  );
  assert.equal(valueOf('9:45 am - 15 hours 10 minutes'), 'Yesterday at 18:35');
});

test('timespan shorthand adds to a clock time', () => {
  assert.equal(preprocessCalendar('now + 4h 3m 5s'), '__dateAdd(__date("now"), "4h 3m 5s", 1)');
  assert.equal(valueOf('9:45 am + 4h 3m 5s'), '13:48');
});

test('date variables work with the date functions', () => {
  assert.equal(preprocessCalendar('days until start'), '__daysBetweenText("today", start)');
  assert.equal(preprocessCalendar('5 workdays after start'), '__addWorkdays(start, 1 * 5)');
  assert.equal(preprocessCalendar('weekday on start'), '__weekday(start)');

  const { results } = evaluateLines([
    'start = March 4, 2025',
    '5 workdays after start',
    'weekday on start',
  ]);
  assert.equal(formatResult(results[1].value), '11 March 2025');
  assert.equal(formatResult(results[2].value), 'Tuesday');
});

test('a duration from today or now', () => {
  assert.equal(
    preprocessCalendar('2 weeks from today'),
    '__dateAdd(__date("today"), "2 weeks", 1)'
  );
  assert.equal(preprocessCalendar('4 days from now'), '__dateAdd(__date("now"), "4 days", 1)');
  assert.equal(valueOf('2 weeks from today'), valueOf('today + 2 weeks'));
});

test('clock intervals chain and aggregate', () => {
  assert.equal(valueOf('9:00 am to 5:30 pm'), '8 hours 30 minutes');
  assert.equal(valueOf('9:00 am to 5:30 pm - 45 minutes'), '7 hours 45 minutes');

  const { results } = evaluateLines([
    'Monday:',
    '9:00 am to 12:30 pm',
    '1:00 pm to 5:30 pm',
    'end',
  ]);
  assert.equal(formatResult(results[0].value), '8 hours');
});

test('the interval between two clock times', () => {
  assert.equal(preprocessCalendar('7:30am to 8:45pm'), '__clockInterval("7:30am", "8:45pm", 1)');
  assert.equal(valueOf('7:30am to 8:45pm'), '13 hours 15 minutes');
  assert.equal(valueOf('4pm to 3am'), '11 hours');
});

test('now is a clock operand', () => {
  assert.equal(preprocessCalendar('23:00 - now'), '__clockInterval("23:00", "now", 0)');
  assert.equal(preprocessCalendar('now to 23:00'), '__clockInterval("now", "23:00", 1)');
  assert.equal(preprocessCalendar('now - 23:00'), '__clockInterval("now", "23:00", 0)');

  for (const line of ['23:00 - now', 'now to 23:00']) {
    const result = evaluateLines([line]).results[0];
    assert.equal(result.type, 'value');
    assert.equal(result.value.timespan, true, 'the interval is a timespan');
  }
});

test('the minus operator resolves clock-time ambiguity like Soulver', () => {
  assert.equal(valueOf('5pm - 7pm'), '2 hours');
  assert.equal(valueOf('5pm - 2pm'), '3 hours');
  assert.equal(valueOf('4pm - 3am'), '13 hours');
  assert.equal(valueOf('3am - 4pm'), '13 hours');
});

test('a one-digit-minute colon range is not mistaken for a clock time', () => {
  assert.equal(preprocessCalendar('1:5'), '1:5');
  assert.equal(preprocessCalendar('5:5'), '5:5');
  assert.equal(preprocessCalendar('100:1'), '100:1');
});

test('a non-ASCII date variable resolves', () => {
  const { results } = evaluateLines(['aniversário = March 4, 2025', 'aniversário + 2 weeks']);
  assert.equal(formatResult(results[1].value), '18 March 2025');
});
