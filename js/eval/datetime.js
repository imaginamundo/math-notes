// Date helpers on top of mathjs. Unix timestamps are rendered in UTC so the
// result is stable across time zones.
function initDatetime(math) {
  math.import(
    {
      fromunix: (unix) => {
        const seconds = Number(unix);
        if (!isFinite(seconds)) throw new Error('fromunix expects a unix timestamp');
        return new Date(seconds * 1000).toLocaleString('en-US', {
          timeZone: 'UTC',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      },
      unix: () => Math.floor(Date.now() / 1000),
    },
    { override: true }
  );
}

export default initDatetime;
