import { currentTime } from './clock.js';
// Date helpers on top of mathjs. Unix timestamps are rendered in UTC so the
// result is stable across time zones.
function initDatetime(math) {
  math.import(
    {
      fromunix: (unix) => {
        let seconds = Number(unix);
        if (!isFinite(seconds)) throw new Error('fromunix expects a unix timestamp');
        // A timestamp of 11 or more digits is not seconds (that would be the year 5138 or
        // later): it is milliseconds, as JavaScript's Date.now() gives.
        if (Math.abs(seconds) >= 1e11 && Math.abs(seconds) < 1e14) seconds /= 1000;
        const date = new Date(seconds * 1000);
        if (Number.isNaN(date.getTime()) || Math.abs(seconds) > 1e11) {
          throw new Error('That timestamp is outside the range of dates');
        }
        return date.toLocaleString('en-US', {
          timeZone: 'UTC',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      },
      unix: () => Math.floor(currentTime().getTime() / 1000),
    },
    { override: true }
  );
}

export default initDatetime;
