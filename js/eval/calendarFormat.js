// Rendering dates, clock times and calendar intervals as strings.
import { getClockFormat } from '../core/clockFormat.js';
import { MONTH_NAMES, MONTH_ABBR, WEEKDAYS, WEEKDAY_ABBR, atNoon, DAY_MS } from './calendarDate.js';

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

export { formatDate, formatClock, formatInterval, formatDatePattern };
