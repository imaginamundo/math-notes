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

// Every context is fresh, which would otherwise be a first run: the onboarding
// tour would open over every test. `seed` lets a test opt into that.
async function newPage({ firstRun = false } = {}) {
  if (context) await context.close();
  context = await browser.createBrowserContext();
  page = await context.newPage();
  errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  if (!firstRun) {
    await page.evaluateOnNewDocument(() => {
      try {
        localStorage.setItem('math-notes-onboarded', '1');
      } catch {
        // storage unavailable
      }
    });
  }
  await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'load' });
  await wait(400);
}

// Pre-seed a storage key before the app's first script runs.
async function newPageWithStorage(entries) {
  if (context) await context.close();
  context = await browser.createBrowserContext();
  page = await context.newPage();
  errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.evaluateOnNewDocument((pairs) => {
    try {
      for (const [key, value] of pairs) localStorage.setItem(key, value);
    } catch {
      // storage unavailable
    }
  }, entries);
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

test('a first visit seeds the Welcome sheet and opens the tour', async () => {
  await newPage({ firstRun: true });
  await wait(500);
  const state = await page.evaluate(() => ({
    tourOpen: Boolean(document.querySelector('.tour-popover')),
    step: document.querySelector('.tour-count')?.textContent,
    highlighted: document.querySelector('.tour-highlight')?.id,
    tabName: document.querySelector('#tabs-bar .tab-name')?.textContent,
    rows: document.querySelectorAll('#view .line-row').length,
    total: document.getElementById('total').textContent,
    flag: localStorage.getItem('math-notes-onboarded'),
  }));
  assert.equal(state.tourOpen, true);
  assert.equal(state.step, '1 of 5');
  assert.equal(state.highlighted, 'tabs-bar', 'the first step highlights its anchor');
  assert.equal(state.tabName, 'Welcome');
  assert.ok(state.rows > 10, `the starter sheet rendered ${state.rows} rows`);
  assert.ok(state.total.length > 0, 'the starter sheet evaluates to a total');
  assert.equal(state.flag, '1', 'the flag is set up front, so a crash cannot loop the tour');
  assert.deepEqual(errors, []);
});

test('the tour walks forward and back, clamped at the first step', async () => {
  await newPage({ firstRun: true });
  await wait(500);
  const step = () => page.evaluate(() => document.querySelector('.tour-count').textContent);

  assert.equal(await step(), '1 of 5');
  assert.equal(
    await page.evaluate(() => document.querySelector('.tour-back').disabled),
    true,
    'Back is disabled on the first step'
  );
  await page.click('.tour-next');
  await wait(150);
  assert.equal(await step(), '2 of 5');
  await page.click('.tour-back');
  await wait(150);
  assert.equal(await step(), '1 of 5');

  for (let i = 0; i < 4; i++) {
    await page.click('.tour-next');
    await wait(120);
  }
  assert.equal(await step(), '5 of 5');
  assert.equal(await page.evaluate(() => document.querySelector('.tour-next').textContent), 'Done');
  await page.click('.tour-next');
  await wait(200);
  assert.equal(await page.evaluate(() => Boolean(document.querySelector('.tour-popover'))), false);
  assert.deepEqual(errors, []);
});

test('skipping the tour sets the flag, and a reload neither tours nor re-seeds', async () => {
  await newPage({ firstRun: true });
  await wait(500);
  await page.click('.tour-skip');
  await wait(200);
  assert.equal(await page.evaluate(() => Boolean(document.querySelector('.tour-popover'))), false);
  assert.equal(await page.evaluate(() => localStorage.getItem('math-notes-onboarded')), '1');

  const seeded = await value();
  await page.reload({ waitUntil: 'load' });
  await wait(600);
  assert.equal(await page.evaluate(() => Boolean(document.querySelector('.tour-popover'))), false);
  assert.equal(await value(), seeded, 'the sheet was not seeded a second time');
  assert.equal(
    await page.evaluate(() => document.querySelectorAll('#tabs-bar [role="tab"]').length),
    1,
    'no extra tab was created'
  );
  assert.deepEqual(errors, []);
});

test('Esc closes the tour', async () => {
  await newPage({ firstRun: true });
  await wait(500);
  await page.keyboard.press('Escape');
  await wait(200);
  assert.equal(await page.evaluate(() => Boolean(document.querySelector('.tour-popover'))), false);
  assert.deepEqual(errors, []);
});

test('arrow keys navigate the tour', async () => {
  await newPage({ firstRun: true });
  await wait(500);
  await page.keyboard.press('ArrowRight');
  await wait(150);
  assert.equal(
    await page.evaluate(() => document.querySelector('.tour-count').textContent),
    '2 of 5'
  );
  await page.keyboard.press('ArrowLeft');
  await wait(150);
  assert.equal(
    await page.evaluate(() => document.querySelector('.tour-count').textContent),
    '1 of 5'
  );
  assert.deepEqual(errors, []);
});

test('a returning visitor with existing tabs is never seeded or toured', async () => {
  // Only the tabs key is set — no onboarding flag. Someone who cleared that
  // one key must not have their sheet overwritten.
  await newPageWithStorage([
    [
      'math-notes-tabs',
      JSON.stringify({
        tabs: [{ id: 'tab-existing', name: 'My work', content: 'salary = 4200\nsalary / 12' }],
        activeId: 'tab-existing',
        nextTabNumber: 2,
      }),
    ],
  ]);
  await wait(500);
  assert.equal(await page.evaluate(() => Boolean(document.querySelector('.tour-popover'))), false);
  assert.equal(await value(), 'salary = 4200\nsalary / 12', 'their sheet survived untouched');
  assert.equal(
    await page.evaluate(() => document.querySelector('#tabs-bar .tab-name').textContent),
    'My work'
  );
  assert.deepEqual(errors, []);
});

test('Settings offers Replay tutorial, which reopens the tour', async () => {
  await newPage();
  await wait(300);
  assert.equal(await page.evaluate(() => Boolean(document.querySelector('.tour-popover'))), false);
  await page.click('#settings-button');
  await wait(200);
  await page.click('#replay-tour-button');
  await wait(300);
  assert.equal(await page.evaluate(() => Boolean(document.querySelector('.tour-popover'))), true);
  assert.equal(
    await page.evaluate(() => document.getElementById('settings-modal').open),
    false,
    'the settings modal steps out of the way'
  );
  assert.equal(
    await page.evaluate(() => document.querySelector('.tour-count').textContent),
    '1 of 5'
  );
  assert.deepEqual(errors, []);
});
