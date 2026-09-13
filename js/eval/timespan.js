// Timespans and double time units:
//   5.5 minutes as timespan              -> 5 min 30 s
//   72 days as timespan                  -> 10 weeks 2 days
//   12.5 minutes in minutes and seconds  -> 12 min 30 s
//   3h 5m 10s                            -> 3 hours + 5 minutes + 10 seconds
//
// A timespan is a display format: `__timespan` returns a small object that
// formatResult renders as components. Consecutive time components are joined
// with `+` (mathjs would otherwise multiply them), and `m` means minutes.

const UNIT_SECONDS = {
  year: 365.2425 * 86400,
  month: 30.436875 * 86400,
  week: 7 * 86400,
  day: 86400,
  hour: 3600,
  minute: 60,
  second: 1,
};

// `as timespan` decomposes from the year down to the second (no months, so
// 72 days reads as 10 weeks 2 days).
const DECOMPOSE_ORDER = ['year', 'week', 'day', 'hour', 'minute', 'second'];

// Spellings accepted in a timespan, mapped to the mathjs unit name.
const COMPONENT_UNIT = {
  y: 'years',
  yr: 'years',
  yrs: 'years',
  year: 'years',
  years: 'years',
  mo: 'months',
  mos: 'months',
  month: 'months',
  months: 'months',
  w: 'weeks',
  wk: 'weeks',
  wks: 'weeks',
  week: 'weeks',
  weeks: 'weeks',
  d: 'days',
  day: 'days',
  days: 'days',
  h: 'hours',
  hr: 'hours',
  hrs: 'hours',
  hour: 'hours',
  hours: 'hours',
  m: 'minutes',
  min: 'minutes',
  mins: 'minutes',
  minute: 'minutes',
  minutes: 'minutes',
  s: 'seconds',
  sec: 'seconds',
  secs: 'seconds',
  second: 'seconds',
  seconds: 'seconds',
};

const CANONICAL_UNIT = {
  years: 'year',
  year: 'year',
  months: 'month',
  month: 'month',
  weeks: 'week',
  week: 'week',
  days: 'day',
  day: 'day',
  hours: 'hour',
  hour: 'hour',
  minutes: 'minute',
  minute: 'minute',
  seconds: 'second',
  second: 'second',
};

const UNIT_ALT = Object.keys(COMPONENT_UNIT)
  .sort((a, b) => b.length - a.length)
  .join('|');
// Units whose explicit conversion should win over the timespan display.
const MINUTE_HOUR_UNITS = new Set([
  'min',
  'mins',
  'minute',
  'minutes',
  'h',
  'hr',
  'hrs',
  'hour',
  'hours',
]);
const COMPONENT_SOURCE = `\\d+(?:\\.\\d+)?\\s*(?:${UNIT_ALT})(?![A-Za-z])`;
const RUN_SOURCE = `${COMPONENT_SOURCE}(?:\\s+${COMPONENT_SOURCE})+`;
const WHOLE_RUN = new RegExp(`^\\s*${RUN_SOURCE}\\s*$`, 'i');

// `3h 5m 10s` -> `3 hours + 5 minutes + 10 seconds`.
function joinTimeComponents(expression) {
  const run = new RegExp(RUN_SOURCE, 'gi');
  return expression.replace(run, (match) => {
    const component = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${UNIT_ALT})(?![A-Za-z])`, 'gi');
    const parts = [];
    let m;
    while ((m = component.exec(match)) !== null) {
      parts.push(`${m[1]} ${COMPONENT_UNIT[m[2].toLowerCase()]}`);
    }
    return parts.join(' + ');
  });
}

function preprocessTimespan(expression) {
  // `as` converts like `to`/`in` (`... as minutes`), except `as timespan`
  // (handled below) and `as a %` (percentage, already consumed).
  const converted = expression.replace(/\s+as\s+(?!timespan\b|a\s+%)/gi, ' to ');
  // mathjs reads `min` as the min() function; a number before it is a minute.
  const normalized = converted.replace(/(\d+(?:\.\d+)?)\s*min(?![\w(])/gi, '$1 minutes');

  // A line that is nothing but time components displays as a timespan.
  if (WHOLE_RUN.test(normalized)) {
    return `__timespan(${joinTimeComponents(normalized)})`;
  }

  const joined = joinTimeComponents(normalized);

  const asTimespan = /^(.*\S)\s+as\s+timespan$/i.exec(joined);
  if (asTimespan) return `__timespan(${asTimespan[1]})`;

  const inParts = /^(.*\S)\s+in\s+([A-Za-z]+)\s+and\s+([A-Za-z]+)$/i.exec(joined);
  if (inParts) {
    const a = CANONICAL_UNIT[inParts[2].toLowerCase()];
    const b = CANONICAL_UNIT[inParts[3].toLowerCase()];
    if (a && b) return `__timespanParts((${inParts[1]}), "${a}", "${b}")`;
  }

  // An explicit conversion to minutes/hours (`... to minutes`, `... as hours`)
  // keeps that unit instead of rendering as a timespan. Seconds/days already
  // keep their unit, and `m` stays meters.
  const timeConversion = /^(.*\S)\s+(?:to|in)\s+([A-Za-z]+)$/i.exec(joined);
  if (timeConversion && MINUTE_HOUR_UNITS.has(timeConversion[2].toLowerCase())) {
    return `__keepUnit(${timeConversion[1]} to ${timeConversion[2]})`;
  }

  return joined;
}

// A timespan is a real Unit (so arithmetic works); the `timespan` property is
// the display hint formatResult reads. Cloned so a marked unit never mutates a
// cached result. `.value` is the value in base SI units (seconds for time) and,
// unlike `.to('s')`, does not change mathjs's preferred unit for later results.
function toTimespanUnit(value, second) {
  if (!value || value.isUnit !== true || !value.equalBase(second)) {
    throw new Error('A timespan needs a time quantity');
  }
  return value.clone();
}

function timespan(value, second) {
  const unit = toTimespanUnit(value, second);
  unit.timespan = true;
  return unit;
}

function timespanParts(value, second, unitA, unitB) {
  const unit = toTimespanUnit(value, second);
  const seconds = unit.value;
  const sizeA = UNIT_SECONDS[unitA];
  const sizeB = UNIT_SECONDS[unitB];
  const countA = Math.floor(seconds / sizeA);
  const remainder = seconds - countA * sizeA;
  unit.timespan = true;
  unit.displayParts = [
    { unit: unitA, value: countA },
    { unit: unitB, value: remainder / sizeB },
  ];
  return unit;
}

function decompose(seconds) {
  const parts = [];
  let rest = Math.round(seconds);
  for (const unit of DECOMPOSE_ORDER) {
    const size = UNIT_SECONDS[unit];
    const count = Math.floor(rest / size);
    if (count > 0) {
      parts.push({ unit, value: count });
      rest -= count * size;
    }
  }
  if (!parts.length) parts.push({ unit: 'second', value: 0 });
  return parts;
}

function unitLabel(unit, value, abbreviate) {
  if (abbreviate && unit === 'minute') return 'min';
  if (abbreviate && unit === 'second') return 's';
  return value === 1 ? unit : `${unit}s`;
}

// Renders a timespan unit's seconds as components. `formatNumber` is injected
// so this stays pure and shares formatResult's number formatting.
function formatTimespan(seconds, parts, formatNumber) {
  const components = parts && parts.length ? parts : decompose(seconds);
  // `5 min 30 s` abbreviates small units; `4 hours 32 minutes 24 seconds` and
  // `10 weeks 2 days` spell them out. Double time units always abbreviate
  // minutes/seconds (`235 hours 12 min`).
  const abbreviateSmall =
    parts && parts.length
      ? (unit) => unit === 'minute' || unit === 'second'
      : () => components[0].unit === 'minute' || components[0].unit === 'second';
  return components
    .map(
      ({ unit, value }) => `${formatNumber(value)} ${unitLabel(unit, value, abbreviateSmall(unit))}`
    )
    .join(' ');
}

function initTimespan(math) {
  const second = math.unit('s');
  math.import(
    {
      __timespan: (value) => timespan(value, second),
      __timespanParts: (value, unitA, unitB) => timespanParts(value, second, unitA, unitB),
      // Marks an explicit conversion so formatResult keeps the requested unit
      // instead of drawing the duration as a timespan.
      __keepUnit: (value) => {
        if (value && value.isUnit === true) value.keepUnit = true;
        return value;
      },
    },
    { override: true }
  );
}

export { preprocessTimespan, initTimespan, formatTimespan };
export default initTimespan;
