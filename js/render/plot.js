// Turns sampled points into an SVG path. Pure: no DOM, no document, fully
// unit-testable. The caller owns the <svg> element.

const AXIS_TICKS = 5;

function niceNumber(value) {
  if (!Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e6 || abs < 1e-4)) return value.toExponential(2);
  return String(Math.round(value * 1000) / 1000);
}

function ticksBetween(min, max, count) {
  if (min === max) return [min];
  const out = [];
  for (let i = 0; i < count; i++) out.push(min + ((max - min) * i) / (count - 1));
  return out;
}

/**
 * Build the path and axis metadata for a series.
 *
 * @param {Array<[number, number]>} points  Finite [x, y] pairs, x ascending.
 * @param {number} width   Viewport width in user units.
 * @param {number} height  Viewport height in user units.
 * @returns {{
 *   d: string,
 *   bounds: { minX: number, maxX: number, minY: number, maxY: number },
 *   xTicks: Array<{ value: number, label: string, position: number }>,
 *   yTicks: Array<{ value: number, label: string, position: number }>,
 *   zeroY: number|null
 * }}
 */
function plotPath(points, width, height) {
  const usable = (Array.isArray(points) ? points : []).filter(
    (point) => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1])
  );

  if (!usable.length) {
    return {
      d: '',
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
      xTicks: [],
      yTicks: [],
      zeroY: null,
    };
  }

  const xs = usable.map((point) => point[0]);
  const ys = usable.map((point) => point[1]);
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);

  // A single point, or a constant series, has no range on that axis. Pad it so
  // the line is drawn centred instead of collapsing onto an edge (or dividing
  // by zero).
  if (minX === maxX) {
    minX -= 1;
    maxX += 1;
  }
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }

  const toX = (x) => ((x - minX) / (maxX - minX)) * width;
  // SVG y grows downwards, so the axis is flipped here.
  const toY = (y) => height - ((y - minY) / (maxY - minY)) * height;

  const round = (value) => Math.round(value * 100) / 100;
  const d = usable
    .map(
      (point, index) => `${index === 0 ? 'M' : 'L'}${round(toX(point[0]))} ${round(toY(point[1]))}`
    )
    .join(' ');

  const axis = (values, project) =>
    values.map((value) => ({
      value,
      label: niceNumber(value),
      position: round(project(value)),
    }));

  return {
    d,
    bounds: { minX, maxX, minY, maxY },
    xTicks: axis(ticksBetween(minX, maxX, AXIS_TICKS), toX),
    yTicks: axis(ticksBetween(minY, maxY, AXIS_TICKS), toY),
    // Only meaningful when the range actually spans zero.
    zeroY: minY < 0 && maxY > 0 ? round(toY(0)) : null,
  };
}

export { plotPath, niceNumber };
export default plotPath;
