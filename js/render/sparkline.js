// An eight-level Unicode block sparkline — the cheapest possible "really low
// resolution graph", needing no new UI at all.
//
// It is computed in the WORKER, from the real numeric array, before
// serialization: by the time a result reaches the main thread it is already a
// formatted string.

const LEVELS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

// Below three points there is no shape to show.
const MIN_POINTS = 3;

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

// Average each bucket rather than sampling one point per bucket, so a spike
// between two sampled indices still shows up.
function downsample(values, width) {
  if (values.length <= width) return values;
  const out = [];
  for (let i = 0; i < width; i++) {
    const from = Math.floor((i * values.length) / width);
    const to = Math.max(from + 1, Math.floor(((i + 1) * values.length) / width));
    const bucket = values.slice(from, to);
    out.push(bucket.reduce((sum, value) => sum + value, 0) / bucket.length);
  }
  return out;
}

/**
 * Render a numeric series as block characters.
 * Returns `''` when there is nothing worth drawing, so the caller can append
 * it unconditionally.
 *
 * @param {unknown} values
 * @param {number} [width]  Maximum characters; longer series are bucket-averaged.
 * @returns {string}
 */
function sparkline(values, width = 24) {
  if (!Array.isArray(values)) return '';
  // Non-finite entries (NaN, Infinity, units, strings) are dropped rather than
  // poisoning the min/max of the whole series.
  const finite = values.filter(isFiniteNumber);
  if (finite.length < MIN_POINTS) return '';

  const points = downsample(finite, Math.max(MIN_POINTS, width));
  const min = Math.min(...points);
  const max = Math.max(...points);

  // A flat series has no range to scale against; draw it as a mid-level row
  // rather than dividing by zero.
  if (min === max) return LEVELS[Math.floor(LEVELS.length / 2)].repeat(points.length);

  const span = max - min;
  return points
    .map((value) => {
      const level = Math.round(((value - min) / span) * (LEVELS.length - 1));
      return LEVELS[level];
    })
    .join('');
}

export { sparkline, LEVELS, MIN_POINTS };
export default sparkline;
