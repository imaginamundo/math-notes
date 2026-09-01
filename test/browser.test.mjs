import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

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

async function waitFor(fn, timeout = 4000) {
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
  await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'load' });
  await wait(400);
}

const value = () => page.evaluate(() => document.getElementById('content-editable').value);

const setContent = (content) =>
  page.evaluate((v) => {
    const ed = document.getElementById('content-editable');
    ed.value = v;
    ed.dispatchEvent(new Event('input', { bubbles: true }));
  }, content);

test('find highlights every match and replace-all rewrites the sheet', async () => {
  await newPage();
  await setContent('10 + 5\nx = 10\n10 * 2');
  await wait(300);
  await page.evaluate(() =>
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'f', metaKey: true, bubbles: true, cancelable: true })
    )
  );
  await wait(100);
  await page.evaluate(() => {
    const input = document.querySelector('.find-input');
    input.value = '10';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await waitFor(() =>
    page.evaluate(() => document.querySelectorAll('#view .find-match').length === 3)
  );
  assert.equal(await page.evaluate(() => document.querySelector('.find-count').textContent), '3/3');
  await page.evaluate(() => document.querySelector('.replace-all').click());
  await wait(300);
  assert.equal(await value(), ' + 5\nx = \n * 2');
  assert.deepEqual(errors, []);
});

test('undo restores the sheet and redo brings the change back', async () => {
  await newPage();
  await setContent('1 + 1');
  await wait(300);
  await page.evaluate(() =>
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true, cancelable: true })
    )
  );
  await wait(200);
  assert.equal(await value(), '');
  await page.evaluate(() =>
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    )
  );
  await wait(200);
  assert.equal(await value(), '1 + 1');
  assert.deepEqual(errors, []);
});

test('snapshots are saved to IndexedDB and recover corrupt localStorage', async () => {
  await newPage();
  await setContent('total = 42');
  await wait(100);
  await page.evaluate(() => document.getElementById('content-editable').blur());
  await waitFor(async () =>
    page.evaluate(async () => {
      const db = await new Promise((res, rej) => {
        const r = indexedDB.open('math-notes');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      const all = await new Promise((res, rej) => {
        const req = db.transaction('snapshots').objectStore('snapshots').getAll();
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      return all.some((s) => s.content.includes('total = 42'));
    })
  );
  await page.evaluate(() => localStorage.setItem('math-notes-tabs', '{not json'));
  await page.reload({ waitUntil: 'load' });
  await waitFor(async () => (await value()) === 'total = 42');
  assert.deepEqual(errors, []);
});

test('tabs can be reordered by dragging', async () => {
  await newPage();
  await page.evaluate(() => document.querySelector('.tab-new').click());
  await wait(150);
  const coords = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.tab')];
    const from = tabs[1].getBoundingClientRect();
    const to = tabs[0].getBoundingClientRect();
    return {
      fromX: from.left + from.width / 2,
      fromY: from.top + from.height / 2,
      toX: to.left + 5,
      toY: to.top + to.height / 2,
    };
  });
  await page.mouse.move(coords.fromX, coords.fromY);
  await page.mouse.down();
  await page.mouse.move(coords.fromX + 10, coords.fromY, { steps: 3 });
  await page.mouse.move(coords.toX, coords.toY, { steps: 8 });
  await page.mouse.up();
  await wait(200);
  const names = await page.evaluate(() =>
    [...document.querySelectorAll('.tab-name')].map((n) => n.textContent)
  );
  assert.deepEqual(names, ['Tab 2', 'Tab 1']);
  assert.deepEqual(errors, []);
});

test('a result on an overflowing line is reachable by horizontal scroll', async () => {
  await newPage();
  const longLine =
    '1234567890 + 1234567890 + 1234567890 + 1234567890 + 1234567890 + 1234567890 + 1234567890 + 1234567890';
  await setContent(longLine + '\n5 + 5');
  await wait(300);
  const visible = await page.evaluate(async () => {
    const scroller = document.querySelector('.editor-scroll');
    scroller.scrollLeft = scroller.scrollWidth;
    await new Promise((r) => setTimeout(r, 80));
    const ghost = document.querySelector('#view .ghost-result');
    const g = ghost.getBoundingClientRect();
    const s = scroller.getBoundingClientRect();
    return g.right <= s.right + 1 && g.left >= s.left;
  });
  assert.equal(visible, true);
  assert.deepEqual(errors, []);
});

test('blank lines keep the ghost rows aligned with the input', async () => {
  await newPage();
  await setContent('pizza = 4\npeople = 4');
  await wait(300);
  const gap = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#view .line-row')];
    const tops = rows.map((r) => Math.round(r.getBoundingClientRect().top));
    return tops[1] - tops[0];
  });
  assert.equal(gap > 20, true);
  // insert a blank line in the middle, then re-check spacing is even
  await page.evaluate(() => {
    const ed = document.getElementById('content-editable');
    ed.focus();
    ed.setSelectionRange(ed.value.indexOf('people'), ed.value.indexOf('people'));
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    );
    ed.value = 'pizza = 4\n\npeople = 4';
    ed.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await wait(300);
  const gaps = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#view .line-row')];
    const tops = rows.map((r) => Math.round(r.getBoundingClientRect().top));
    const heights = rows.map((r) => Math.round(r.getBoundingClientRect().height));
    return {
      gaps: [tops[1] - tops[0], tops[2] - tops[1]],
      row0Height: heights[0],
      blankRowHeight: heights[1],
    };
  });
  assert.ok(Math.abs(gaps.gaps[0] - gaps.gaps[1]) < 2, 'rows spaced evenly');
  assert.ok(gaps.blankRowHeight > 20, 'blank row keeps its line height');
  assert.deepEqual(errors, []);
});
