import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

// A rough end-to-end performance harness. It seeds a large sheet and measures
// the two costs a keystroke pays: the synchronous main-thread work (render +
// sizing + caret) and the worker evaluation round-trip. The bounds are loose
// on purpose (headless Chrome on a busy CI box is noisy); they exist to catch
// order-of-magnitude regressions, and the numbers are printed so a run can be
// compared against a previous one. Set PERF_LINES to stress a larger sheet.
const SHEET_LINES = Number(process.env.PERF_LINES) || 1000;

const root = fileURLToPath(new URL('..', import.meta.url));
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
};

const server = createServer(async (req, res) => {
  try {
    let path = normalize(decodeURIComponent(req.url.split('?')[0]));
    if (path === '/') path = '/index.html';
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(await readFile(join(root, path)));
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

let browser;
let context;
let page;
let errors = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await fn()) return;
    await wait(50);
  }
  throw new Error('waitFor timed out');
}

before(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
});

after(async () => {
  if (browser) await browser.close();
  server.close();
});

async function newPage() {
  if (context) await context.close();
  context = await browser.createBrowserContext();
  page = await context.newPage();
  errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('math-notes-onboarded', '1');
      localStorage.setItem('math-notes-language', 'en');
    } catch {
      // storage unavailable
    }
  });
  await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'load' });
  await wait(400);
}

// A realistic sheet: assignments, arithmetic, tags, a multi-word name, a group
// and a `line(n)` reference, so the hot paths (variable scan, aggregation,
// grouping, references) are all in play.
function buildSheet(lineCount) {
  const lines = [];
  lines.push('monthly income = 4200', 'monthly income / 12', '');
  for (let i = 0; lines.length < lineCount - 6; i++) {
    lines.push(`v${i} = ${i}`);
    lines.push(`v${i} * 2 + 1 #t${i % 4}`);
  }
  lines.push('', 'Group:', '10', '20', 'end', 'line(4) + 1');
  return lines.slice(0, lineCount).join('\n');
}

const totalText = () => page.evaluate(() => document.getElementById('total').textContent);

test('a large sheet stays responsive to typing', async () => {
  await newPage();
  const sheet = buildSheet(SHEET_LINES);
  const lineCount = sheet.split('\n').length;

  // Initial full render + first evaluation.
  const firstPaint = await page.evaluate((value) => {
    const ed = document.getElementById('content-editable');
    const t0 = performance.now();
    ed.value = value;
    ed.dispatchEvent(new Event('input', { bubbles: true }));
    return performance.now() - t0;
  }, sheet);
  await waitFor(async () => (await totalText()).length > 0);
  const rows = await page.evaluate(() => document.querySelectorAll('#view .line-row').length);
  assert.ok(rows >= lineCount, `rendered ${rows} rows for ${lineCount} lines`);

  // A single-character edit in the middle: this is the per-keystroke cost.
  const edit = await page.evaluate(() => {
    const ed = document.getElementById('content-editable');
    ed.focus();
    const pos = Math.floor(ed.value.length / 2);
    ed.setSelectionRange(pos, pos);
    const t0 = performance.now();
    ed.setRangeText('x', pos, pos, 'end');
    ed.dispatchEvent(new Event('input', { bubbles: true }));
    return performance.now() - t0;
  });

  // A second edit, to measure the incremental path (no full rebuild).
  const edit2 = await page.evaluate(() => {
    const ed = document.getElementById('content-editable');
    const pos = Math.floor(ed.value.length / 2);
    ed.setSelectionRange(pos, pos);
    const t0 = performance.now();
    ed.setRangeText('y', pos, pos, 'end');
    ed.dispatchEvent(new Event('input', { bubbles: true }));
    return performance.now() - t0;
  });

  console.log(
    `perf: ${lineCount} lines — first paint ${firstPaint.toFixed(1)}ms, ` +
      `keystroke ${edit.toFixed(1)}ms / ${edit2.toFixed(1)}ms`
  );

  assert.ok(firstPaint < 2000, `first paint took ${firstPaint.toFixed(1)}ms`);
  assert.ok(edit2 < 120, `incremental keystroke took ${edit2.toFixed(1)}ms`);
  assert.deepEqual(errors, []);
});
