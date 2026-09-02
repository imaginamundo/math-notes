import initModal from './modal.js';
import plotPath, { niceNumber } from '../render/plot.js';

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 320;
const SVG_NS = 'http://www.w3.org/2000/svg';
const SAMPLES = 64;

/**
 * The Plot modal: pick a single-argument function defined in the current
 * sheet, choose a domain, and draw it at a deliberately low sample count.
 *
 * The function is never available here — `evaluateLine` drops function results
 * and structured clone cannot carry them — so sampling round-trips through the
 * worker via `evalClient.requestPlot`.
 *
 * @param {HTMLTextAreaElement} editableNode
 * @param {{ requestLines: Function, requestPlot: Function }} evalClient
 */
function initPlot(editableNode, evalClient) {
  const modalNode = document.getElementById('plot-modal');
  const buttonNode = document.getElementById('plot-button');
  if (!modalNode || !buttonNode) return;

  const selectNode = modalNode.querySelector('#plot-function');
  const fromNode = modalNode.querySelector('#plot-from');
  const toNode = modalNode.querySelector('#plot-to');
  const chartNode = modalNode.querySelector('#plot-chart');
  const statusNode = modalNode.querySelector('#plot-status');
  const summaryNode = modalNode.querySelector('#plot-summary');

  function element(tag, attributes) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  }

  function clearChart() {
    while (chartNode.firstChild) chartNode.removeChild(chartNode.firstChild);
  }

  function draw(points) {
    clearChart();
    const { d, xTicks, yTicks, zeroY } = plotPath(points, VIEW_WIDTH, VIEW_HEIGHT);
    if (!d) return;

    const LABEL_HEIGHT = 14;
    const X_AXIS_BAND = 18;

    for (const tick of yTicks) {
      chartNode.appendChild(
        element('line', {
          class: 'plot-grid',
          x1: 0,
          y1: tick.position,
          x2: VIEW_WIDTH,
          y2: tick.position,
        })
      );
      // Keep the label inside the viewport: the topmost tick sits at y = 0,
      // and the bottom one would collide with the x-axis row.
      const y = Math.min(Math.max(tick.position - 4, LABEL_HEIGHT), VIEW_HEIGHT - X_AXIS_BAND - 2);
      chartNode.appendChild(element('text', { class: 'plot-label', x: 4, y })).textContent =
        tick.label;
    }
    for (const [index, tick] of xTicks.entries()) {
      // The first and last labels would be half-clipped if centred.
      const anchor = index === 0 ? 'start' : index === xTicks.length - 1 ? 'end' : 'middle';
      const x = index === 0 ? 4 : index === xTicks.length - 1 ? VIEW_WIDTH - 4 : tick.position;
      chartNode.appendChild(
        element('text', {
          class: 'plot-label plot-label-x',
          x,
          y: VIEW_HEIGHT - 4,
          'text-anchor': anchor,
        })
      ).textContent = tick.label;
    }
    // Only drawn when the series actually crosses zero.
    if (zeroY !== null) {
      chartNode.appendChild(
        element('line', { class: 'plot-axis', x1: 0, y1: zeroY, x2: VIEW_WIDTH, y2: zeroY })
      );
    }
    chartNode.appendChild(element('path', { class: 'plot-line', d }));
  }

  function setStatus(text) {
    statusNode.textContent = text;
  }

  // The ghost layer is decorative and aria-hidden, so the modal carries the
  // accessible description of the series alongside the SVG.
  function setSummary(name, points, skipped) {
    if (!points.length) {
      summaryNode.textContent = '';
      return;
    }
    const ys = points.map((point) => point[1]);
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    const skippedText = skipped
      ? ` ${skipped} of ${points.length + skipped} points undefined.`
      : '';
    summaryNode.textContent =
      `${name} sampled at ${points.length} points from ${niceNumber(points[0][0])} to ` +
      `${niceNumber(points[points.length - 1][0])}, ranging from ${niceNumber(min)} to ` +
      `${niceNumber(max)}.${skippedText}`;
  }

  async function refresh() {
    const name = selectNode.value;
    if (!name) return;
    const from = Number(fromNode.value);
    const to = Number(toNode.value);
    try {
      const { points, skipped, reason } = await evalClient.requestPlot(name, from, to, SAMPLES);
      if (reason) {
        clearChart();
        setStatus(reason);
        setSummary(name, [], 0);
        return;
      }
      draw(points);
      // Report dropped points rather than silently drawing a gap.
      setStatus(
        skipped
          ? `${skipped} of ${points.length + skipped} points were undefined and were skipped`
          : `${points.length} points`
      );
      setSummary(name, points, skipped);
    } catch (error) {
      clearChart();
      setStatus(error.message || "Couldn't plot that function");
      setSummary(name, [], 0);
    }
  }

  async function populate() {
    const previous = selectNode.value;
    let names = [];
    try {
      const { results } = await evalClient.requestLines(editableNode.value.split('\n'));
      names = results
        .filter((result) => result && result.fn && result.fn.arity === 1)
        .map((result) => result.fn.name);
    } catch {
      // evaluation failed; treat it as "no plottable functions"
    }
    // De-duplicate: redefining a function leaves both lines tagged.
    const functions = [...new Set(names)];

    selectNode.replaceChildren();
    for (const name of functions) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      selectNode.appendChild(option);
    }
    selectNode.disabled = functions.length === 0;

    if (!functions.length) {
      clearChart();
      setStatus('No plottable functions yet — define one like  double = f(x) = x * 2');
      summaryNode.textContent = '';
      return;
    }
    selectNode.value = functions.includes(previous) ? previous : functions[0];
    await refresh();
  }

  initModal(modalNode, buttonNode, {
    onOpen: populate,
    onClose: () => editableNode.focus(),
  });

  selectNode.addEventListener('change', refresh);
  fromNode.addEventListener('change', refresh);
  toNode.addEventListener('change', refresh);
  document.addEventListener('plot:open', () => buttonNode.click());
}

export default initPlot;
