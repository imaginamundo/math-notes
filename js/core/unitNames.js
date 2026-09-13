// Readable unit labels for prose (`per day`, not `per days` or `per d`).
// Shared by the result formatter and the money-mix error.

const READABLE = {
  // Plurals.
  seconds: 'second',
  minutes: 'minute',
  hours: 'hour',
  days: 'day',
  weeks: 'week',
  months: 'month',
  years: 'year',
  decades: 'decade',
  centuries: 'century',
  // Common abbreviations.
  s: 'second',
  sec: 'second',
  secs: 'second',
  min: 'minute',
  mins: 'minute',
  h: 'hour',
  hr: 'hour',
  hrs: 'hour',
  d: 'day',
  w: 'week',
  mo: 'month',
  y: 'year',
};

export function readableUnit(name) {
  return READABLE[name] || name;
}
