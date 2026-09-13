import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLines } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';
import { preprocessCalendar } from '../js/eval/calendar.js';

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
    '__daysBetweenText("today", "Christmas")'
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

test('the interval between two dates', () => {
  assert.equal(valueOf('January 10 - February 5'), '3 weeks 5 days');
  assert.equal(valueOf('3 March to 30 May'), '2 months 3 weeks 6 days');
  assert.equal(valueOf('April 1 through April 30 in days'), '30');
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

test('adding and subtracting workdays', () => {
  assert.equal(valueOf('5 workdays after March 14, 2019'), '21 March 2019');
  assert.equal(valueOf('3 workdays before March 14, 2019'), '11 March 2019');
});

test('work hours assume an eight-hour workday', () => {
  assert.equal(valueOf('work hours in June 2026'), '176');
});

test('the weekday of a date', () => {
  assert.equal(valueOf('day of the week on January 24, 1984'), 'Tuesday');
  assert.equal(valueOf('weekday on March 9, 2024'), 'Saturday');
});
