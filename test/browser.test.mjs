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

async function readTestFile(path) {
  const resolved = join(root, normalize(path));
  try {
    return { file: await readFile(resolved), type: extname(resolved) };
  } catch (error) {
    if (error.code === 'EISDIR' || (error.code === 'ENOENT' && !extname(resolved))) {
      return { file: await readFile(join(resolved, 'index.html')), type: '.html' };
    }
    throw error;
  }
}

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(req.url.split('?')[0]);
    if (path.endsWith('/')) path += 'index.html';
    const { file, type } = await readTestFile(path);
    res.writeHead(200, { 'Content-Type': MIME[type] || 'application/octet-stream' });
    res.end(file);
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

// Every context is fresh, which would otherwise be a first run and seed the
// Welcome sheet over every test. `firstRun` lets a test opt into that.
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
        if (!localStorage.getItem('math-notes-language')) {
          localStorage.setItem('math-notes-language', 'en');
        }
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
      if (!localStorage.getItem('math-notes-language')) {
        localStorage.setItem('math-notes-language', 'en');
      }
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

test('undo keeps the view near the change in a large sheet', async () => {
  await newPage();
  const big = Array.from({ length: 300 }, (_, i) => `line ${i + 1} = ${i + 1}`).join('\n');
  await setContent(big);
  await wait(900);

  // Insert at the very top, then undo it.
  await page.evaluate(() => {
    const ed = document.getElementById('content-editable');
    ed.focus();
    ed.setSelectionRange(0, 0);
    document.execCommand('insertText', false, 'x');
  });
  await wait(900);
  await page.evaluate(() =>
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true, cancelable: true })
    )
  );
  await wait(300);

  const after = await page.evaluate(() => {
    const ed = document.getElementById('content-editable');
    const scroller = ed.closest('.editor-scroll');
    return {
      start: ed.selectionStart,
      scrollTop: Math.round(scroller.scrollTop),
      head: ed.value.slice(0, 6),
    };
  });
  assert.equal(after.head, 'line 1', 'the edit was undone');
  assert.ok(after.start <= 2, 'the caret stays near the change, not at the end');
  assert.ok(after.scrollTop < 100, 'the view does not scroll to the end');
  assert.deepEqual(errors, []);
});

test('the caret position is restored when the page reloads', async () => {
  await newPage();
  await page.evaluate(() => {
    const ed = document.getElementById('content-editable');
    ed.value = 'aaaa\nbbbb\ncccc';
    ed.dispatchEvent(new Event('input', { bubbles: true }));
    ed.focus();
    ed.setSelectionRange(6, 8);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await wait(900);
  await page.reload({ waitUntil: 'load' });
  await wait(400);

  const caret = await page.evaluate(() => {
    const ed = document.getElementById('content-editable');
    return { value: ed.value, start: ed.selectionStart, end: ed.selectionEnd };
  });
  assert.equal(caret.value, 'aaaa\nbbbb\ncccc');
  assert.equal(caret.start, 6);
  assert.equal(caret.end, 8);
  assert.deepEqual(errors, []);
});

test('a corrupt saved caret is ignored at startup', async () => {
  if (context) await context.close();
  context = await browser.createBrowserContext();
  page = await context.newPage();
  errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('math-notes-onboarded', '1');
    localStorage.setItem(
      'math-notes-tabs',
      JSON.stringify({
        tabs: [{ id: 't1', name: 'A', content: 'hello world', caret: { start: 9999, end: -1 } }],
        activeId: 't1',
        nextTabNumber: 2,
      })
    );
  });
  await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'load' });
  await wait(400);

  const state = await page.evaluate(() => {
    const ed = document.getElementById('content-editable');
    return { value: ed.value, start: ed.selectionStart, end: ed.selectionEnd };
  });
  assert.equal(state.value, 'hello world');
  assert.ok(state.start >= 0 && state.start <= state.value.length);
  assert.ok(state.end >= 0 && state.end <= state.value.length);
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
      // Snapshots may be stored deflated, so decode before checking the text.
      const decode = async (snapshot) => {
        if (!snapshot.compressed) return snapshot.content;
        const base64 = snapshot.content.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
        return new TextDecoder().decode(await new Response(stream).arrayBuffer());
      };
      const texts = await Promise.all(all.map(decode));
      return texts.some((text) => text.includes('total = 42'));
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

test('find marks wrap typed text and ignore ghost results', async () => {
  await newPage();
  await setContent('1 + 1\nhello world\n20');
  // Wait for ghost results (one value ghost per numeric line plus an error
  // ghost for the unknown word) — none of them may become searchable text.
  await waitFor(() =>
    page.evaluate(() => document.querySelectorAll('#view .ghost-result').length === 3)
  );
  await page.evaluate(() =>
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'f', metaKey: true, bubbles: true, cancelable: true })
    )
  );
  await page.evaluate(() => {
    const input = document.querySelector('.find-input');
    input.value = 'o';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await waitFor(() =>
    page.evaluate(() => document.querySelectorAll('#view .find-match').length === 2)
  );
  const marks = await page.evaluate(() =>
    [...document.querySelectorAll('#view .find-match')].map((mark) => mark.textContent)
  );
  assert.deepEqual(marks, ['o', 'o']);

  // Closing the bar must unwrap the marks and leave the typed text intact.
  await page.evaluate(() =>
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    )
  );
  assert.equal(await page.evaluate(() => document.querySelectorAll('#view .find-match').length), 0);
  const text = await page.evaluate(() =>
    [...document.querySelectorAll('#view .line')].map((line) => line.textContent).join('\n')
  );
  assert.equal(text, '1 + 1\nhello world\n20');
  assert.deepEqual(errors, []);
});

test('clicking a line number comments and uncomments that line', async () => {
  await newPage();
  await setContent('1 + 1\n2 + 2\n# 3 + 3');
  await wait(150);

  const clickLine = (index) =>
    page.evaluate((i) => document.querySelectorAll('.line-numbers span')[i].click(), index);

  // Comment line 2; a line that is already a comment is left as is.
  await clickLine(1);
  assert.equal(await value(), '1 + 1\n# 2 + 2\n# 3 + 3');

  // Uncomment line 2 again.
  await clickLine(1);
  assert.equal(await value(), '1 + 1\n2 + 2\n# 3 + 3');

  // A double hash loses exactly one marker.
  await setContent('## note\n5');
  await wait(150);
  await clickLine(0);
  assert.equal(await value(), '# note\n5');

  // A tag is not a comment: toggling comments it out instead of stripping it.
  await setContent('#food\n5');
  await wait(150);
  await clickLine(0);
  assert.equal(await value(), '# #food\n5');
  await clickLine(0);
  assert.equal(await value(), '#food\n5');
  assert.deepEqual(errors, []);
});

test('a line reference shows the referenced value in place', async () => {
  await newPage();
  await setContent('5\nline(1)');
  await waitFor(() =>
    page.evaluate(() => {
      const ref = document.querySelector('#view .reference');
      return Boolean(ref && ref.classList.contains('resolved'));
    })
  );

  // Caret on line 1: the reference row is inactive, so the value stands in.
  await page.evaluate(() => {
    const ed = document.getElementById('content-editable');
    ed.focus();
    ed.selectionStart = 0;
    ed.selectionEnd = 0;
    ed.dispatchEvent(new Event('keyup', { bubbles: true }));
  });
  await wait(100);
  const inactive = await page.evaluate(() => {
    const ref = document.querySelector('#view .reference');
    return {
      text: ref.textContent,
      value: ref.dataset.value,
      title: ref.title,
      color: getComputedStyle(ref).color,
      shown: getComputedStyle(ref, '::after').content,
      opacity: getComputedStyle(ref, '::after').opacity,
    };
  });
  assert.equal(inactive.text, 'line(1)', 'the raw token stays for offsets');
  assert.equal(inactive.value, '5');
  assert.equal(inactive.title, '5');
  assert.equal(inactive.color, 'rgba(0, 0, 0, 0)', 'the raw token is transparent');
  assert.equal(inactive.shown, '"5"', 'the value is drawn in place of the token');
  assert.equal(inactive.opacity, '1');

  // Caret on the reference line: the token is revealed and the value dims.
  await page.evaluate(() => {
    const ed = document.getElementById('content-editable');
    ed.focus();
    ed.selectionStart = ed.value.length;
    ed.selectionEnd = ed.value.length;
    ed.dispatchEvent(new Event('keyup', { bubbles: true }));
  });
  await wait(100);
  const active = await page.evaluate(() => {
    const ref = document.querySelector('#view .reference');
    return {
      color: getComputedStyle(ref).color,
      opacity: getComputedStyle(ref, '::after').opacity,
    };
  });
  assert.notEqual(active.color, 'rgba(0, 0, 0, 0)', 'the token is visible while editing');
  assert.equal(active.opacity, '0.5');
  assert.deepEqual(errors, []);
});

test('a line reference updates when the referenced line changes', async () => {
  await newPage();
  await setContent('5\nline(1)');
  await waitFor(() =>
    page.evaluate(() => document.querySelector('#view .reference')?.dataset.value === '5')
  );
  await setContent('7\nline(1)');
  await waitFor(() =>
    page.evaluate(() => document.querySelector('#view .reference')?.dataset.value === '7')
  );
  assert.deepEqual(errors, []);
});

test('Cmd+G jumps the caret to the requested line', async () => {
  await newPage();
  await setContent('one = 1\n\nthree = 3\n\nfive = 5');
  await wait(150);

  await page.evaluate(() =>
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'g', metaKey: true, bubbles: true, cancelable: true })
    )
  );
  await wait(50);
  assert.equal(await page.evaluate(() => Boolean(document.querySelector('.go-to-bar.open'))), true);

  await page.evaluate(() => {
    const input = document.querySelector('.go-to-input');
    input.value = '5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    );
  });
  await wait(50);
  assert.equal(
    await page.evaluate(() => Boolean(document.querySelector('.go-to-bar.open'))),
    false
  );
  const caretLine = await page.evaluate(() => {
    const ed = document.getElementById('content-editable');
    return ed.value.slice(0, ed.selectionStart).split('\n').length - 1;
  });
  assert.equal(caretLine, 4, 'caret moved to the start of line 5');
  assert.deepEqual(errors, []);
});

test('a group shows its subtotal on the header line', async () => {
  await newPage();
  await setContent('Groceries:\n4.50\n3.20\n2.40\nend');
  await waitFor(() =>
    page.evaluate(() => {
      const rows = document.querySelectorAll('#view .line-row');
      return rows[0] && Boolean(rows[0].querySelector('.ghost-result'));
    })
  );
  const state = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#view .line-row')].slice(0, 5);
    const widths = rows.map((row) => Math.round(row.getBoundingClientRect().width));
    const before = (row) => getComputedStyle(row, '::before');
    return {
      ghost: rows[0].querySelector('.ghost-result').textContent,
      header: rows[0].classList.contains('group-header'),
      body: rows[1].classList.contains('group-body'),
      end: rows[4].classList.contains('group-end'),
      endGhost: Boolean(rows[4].querySelector('.ghost-result')),
      endColor: getComputedStyle(rows[4].querySelector('.title')).color,
      widths,
      topRadius: before(rows[0]).borderTopLeftRadius,
      bottomRadius: before(rows[4]).borderBottomLeftRadius,
      insetLeft: before(rows[0]).left,
      insetRight: before(rows[0]).right,
    };
  });
  assert.equal(state.ghost, '→ 10.1');
  assert.equal(state.header, true);
  assert.equal(state.body, true);
  assert.equal(state.end, true);
  assert.equal(state.endGhost, false, 'the end row carries no result');
  assert.equal(state.endColor, 'rgb(154, 164, 176)', 'end matches the label colour');
  assert.equal(new Set(state.widths).size, 1, 'the group shades as one uniform box');
  assert.equal(state.topRadius, '4px');
  assert.equal(state.bottomRadius, '4px');
  assert.notEqual(state.insetLeft, '0px', 'the box has breathing room on the left');
  assert.notEqual(state.insetRight, '0px', 'the box has breathing room on the right');

  // Editing a body line must refresh the header subtotal above it.
  await setContent('Groceries:\n5.50\n3.20\n2.40\nend');
  await waitFor(() =>
    page.evaluate(() => {
      const header = document.querySelector('#view .line-row');
      const ghost = header && header.querySelector('.ghost-result');
      return ghost && ghost.textContent === '→ 11.1';
    })
  );
  assert.deepEqual(errors, []);
});

test('the total keeps a shared unit and falls back to plain numbers', async () => {
  await newPage();
  await setContent('10 cm\n5 cm');
  await waitFor(() =>
    page.evaluate(() => document.getElementById('total').textContent.includes('cm'))
  );
  assert.equal(await page.evaluate(() => document.getElementById('total').textContent), '15 cm');

  await setContent('10 cm\n5 kg\n10\n10');
  await waitFor(() => page.evaluate(() => document.getElementById('total').textContent === '20'));
  assert.deepEqual(errors, []);
});

test('Tab indents and Shift+Tab outdents', async () => {
  await newPage();
  await setContent('a\nb');
  await page.focus('#content-editable');

  // No selection: insert two spaces at the caret.
  await page.keyboard.press('Tab');
  assert.equal(await value(), 'a\nb  ');
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    'content-editable',
    'Tab stays trapped in the editor'
  );

  // Multi-line selection: indent every line, then outdent them again.
  await page.evaluate(() => {
    const ed = document.getElementById('content-editable');
    ed.setSelectionRange(0, ed.value.length);
  });
  await page.keyboard.press('Tab');
  assert.equal(await value(), '  a\n  b  ');
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  assert.equal(await value(), 'a\nb  ');
  assert.deepEqual(errors, []);
});

test('Shift+Tab keeps the selection on the same lines', async () => {
  await newPage();
  await setContent('  a\n  b\n  c');
  await page.focus('#content-editable');
  await page.evaluate(() => {
    const ed = document.getElementById('content-editable');
    ed.setSelectionRange(0, 7); // through the end of "  b", before its newline
  });
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');

  const state = await page.evaluate(() => {
    const ed = document.getElementById('content-editable');
    return {
      value: ed.value,
      end: ed.selectionEnd,
      endLine: ed.value.slice(0, ed.selectionEnd).split('\n').length - 1,
    };
  });
  assert.equal(state.value, 'a\nb\n  c');
  assert.equal(state.end, 3, 'the end stays before the newline');
  assert.equal(state.endLine, 1, 'the selection does not grow onto the next line');
  assert.deepEqual(errors, []);
});

test('autocomplete offers variables and functions and inserts the choice', async () => {
  await newPage();

  // Focus the editor with the caret at the end of `content`.
  const type = (content) =>
    page.evaluate((v) => {
      const ed = document.getElementById('content-editable');
      ed.focus();
      ed.value = v;
      ed.setSelectionRange(v.length, v.length);
      ed.dispatchEvent(new Event('input', { bubbles: true }));
    }, content);
  const suggestions = () =>
    page.evaluate(() => {
      const node = document.getElementById('autocomplete-list');
      if (!node || node.hidden) return [];
      return [...node.children].map(
        (child) => child.querySelector('.autocomplete-text').textContent
      );
    });

  // A defined variable outranks a unit with the same prefix.
  await type('monthly rent = 1500\nmon');
  await waitFor(async () => (await suggestions())[0] === 'monthly rent');
  assert.equal((await suggestions())[0], 'monthly rent');
  await page.keyboard.press('Enter');
  assert.equal(await value(), 'monthly rent = 1500\nmonthly rent');

  // Enter accepts and a function gets its opening bracket.
  await type('sqr');
  await waitFor(async () => (await suggestions())[0] === 'sqrt');
  await page.keyboard.press('Enter');
  assert.equal(await value(), 'sqrt(');

  // A number has no completable word, so the popup stays closed.
  await type('3.5');
  await wait(100);
  assert.deepEqual(await suggestions(), []);
  assert.deepEqual(errors, []);
});

test('autocomplete offers sheet tags after a #', async () => {
  await newPage();

  const type = (content) =>
    page.evaluate((v) => {
      const ed = document.getElementById('content-editable');
      ed.focus();
      ed.value = v;
      ed.setSelectionRange(v.length, v.length);
      ed.dispatchEvent(new Event('input', { bubbles: true }));
    }, content);
  const suggestions = () =>
    page.evaluate(() => {
      const node = document.getElementById('autocomplete-list');
      if (!node || node.hidden) return [];
      return [...node.children].map(
        (child) => child.querySelector('.autocomplete-text').textContent
      );
    });

  // A single `#` opens the popup, showing only tags (not the vocabulary).
  await type('20 #food\n30 #fare\n#');
  await waitFor(async () => (await suggestions()).includes('#food'));
  const items = await suggestions();
  assert.ok(items.includes('#fare'), 'tags from the sheet are offered');
  assert.ok(!items.includes('sqrt'), 'a # keeps the popup in tag mode only');

  // The prefix filters, and Enter inserts the whole tag.
  await type('20 #food\n30 #fare\n#far');
  await waitFor(async () => (await suggestions())[0] === '#fare');
  await page.keyboard.press('Enter');
  assert.equal(await value(), '20 #food\n30 #fare\n#fare');
  assert.deepEqual(errors, []);
});

test('autocomplete scrolls the highlighted option into view', async () => {
  await newPage();
  await page.evaluate(() => {
    const ed = document.getElementById('content-editable');
    ed.focus();
    ed.value = 'co';
    ed.setSelectionRange(2, 2);
    ed.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await waitFor(() => page.evaluate(() => !document.getElementById('autocomplete-list').hidden));

  // Force the list to overflow so the scroll-into-view path is exercised
  // regardless of the popup's measured height.
  await page.evaluate(() => {
    document.getElementById('autocomplete-list').style.maxHeight = '3em';
  });
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');

  const state = await page.evaluate(() => {
    const list = document.getElementById('autocomplete-list');
    const active = list.querySelector('.autocomplete-option.active');
    return {
      scrollTop: list.scrollTop,
      activeBottom: active.offsetTop + active.offsetHeight,
      viewBottom: list.scrollTop + list.clientHeight,
    };
  });
  assert.ok(state.scrollTop > 0, 'the list scrolled to follow the highlight');
  assert.ok(state.activeBottom <= state.viewBottom + 1, 'the highlight stays in view');
  assert.deepEqual(errors, []);
});

test('the placeholder stays hidden until the app is ready', async () => {
  await newPage();
  const state = await page.evaluate(() => {
    const ed = document.getElementById('content-editable');
    const ready = ed.classList.contains('ready');
    const visible = getComputedStyle(ed, '::placeholder').color;
    ed.classList.remove('ready');
    const hidden = getComputedStyle(ed, '::placeholder').color;
    ed.classList.add('ready');
    return { ready, visible, hidden };
  });
  assert.equal(state.ready, true, 'boot marks the editor ready');
  assert.equal(state.hidden, 'rgba(0, 0, 0, 0)', 'no placeholder before ready');
  assert.notEqual(state.visible, 'rgba(0, 0, 0, 0)', 'placeholder returns once ready');
  assert.deepEqual(errors, []);
});

test('a result on an overflowing line is reachable by horizontal scroll', async () => {
  await newPage();
  const longLine =
    '1234567890 + 1234567890 + 1234567890 + 1234567890 + 1234567890 + 1234567890 + 1234567890 + 1234567890';
  await setContent(longLine + '\n5 + 5');
  await waitFor(() => page.evaluate(() => Boolean(document.querySelector('#view .ghost-result'))));
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

test('the horizontal scroll clears the gutter at the start of an overflowing line', async () => {
  await newPage();
  const longLine = 'word '.repeat(80).trim();
  await setContent(longLine + '\n5 + 5');
  await wait(300);

  // Move the caret to the end of the long first line and let it scroll right.
  await page.evaluate(() => {
    const ed = document.getElementById('content-editable');
    ed.focus();
    const caret = ed.value.indexOf('\n');
    ed.setSelectionRange(caret, caret);
    ed.dispatchEvent(new KeyboardEvent('keyup', { key: 'End', bubbles: true }));
  });
  await wait(100);
  const atEnd = await page.evaluate(() => document.querySelector('.editor-scroll').scrollLeft);
  assert.ok(atEnd > 0, 'the long line scrolls horizontally');

  // Home must bring the caret back into view, clear of the fixed line gutter.
  await page.keyboard.press('Home');
  await wait(120);
  const state = await page.evaluate(() => {
    const scroller = document.querySelector('.editor-scroll');
    const ed = document.getElementById('content-editable');
    const gutter = document.querySelector('.line-numbers');
    const gutterRight = gutter
      ? gutter.getBoundingClientRect().right - scroller.getBoundingClientRect().left
      : 0;
    const cs = getComputedStyle(ed);
    return {
      scrollLeft: scroller.scrollLeft,
      caretScreenX: parseFloat(cs.paddingLeft) - scroller.scrollLeft,
      gutterRight,
    };
  });
  assert.equal(state.scrollLeft, 0, 'scrolled fully back to the start');
  assert.ok(state.caretScreenX >= state.gutterRight, 'the caret is not hidden behind the gutter');
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

test('the Share button builds a link that reopens the sheet in a new tab', async () => {
  await newPage();
  const sheet = '# trip 🧳\nnights = 3\nrate = 89\nnights * rate';
  await setContent(sheet);
  await wait(300);

  // Read the URL off the button's dataset rather than the clipboard, which
  // needs permissions headless Chrome does not grant.
  await page.click('#share-button');
  await waitFor(() =>
    page.evaluate(() => Boolean(document.getElementById('share-button').dataset.url))
  );
  const url = await page.evaluate(() => document.getElementById('share-button').dataset.url);
  assert.ok(url.includes('#s='), url);
  assert.equal(url.includes('?'), false, 'the sheet must not be in a query string');
  assert.equal(
    await page.evaluate(() => document.getElementById('share-status').textContent),
    'Link copied'
  );

  const tabsBefore = await page.evaluate(
    () => document.querySelectorAll('#tabs-bar [role="tab"]').length
  );

  page.once('dialog', (dialog) => dialog.accept());
  await page.goto(url, { waitUntil: 'load' });
  await wait(600);

  assert.equal(await value(), sheet, 'the shared sheet reopened verbatim');
  assert.equal(
    await page.evaluate(() => document.querySelectorAll('#tabs-bar [role="tab"]').length),
    tabsBefore + 1,
    'the import added a tab instead of overwriting one'
  );
  assert.equal(
    await page.evaluate(() => window.location.hash),
    '',
    'the fragment is stripped so a refresh cannot re-import'
  );
  assert.deepEqual(errors, []);
});

test('a share link the visitor declines leaves the sheet untouched', async () => {
  await newPage();
  await setContent('keep = 1');
  await wait(300);
  await page.click('#share-button');
  await waitFor(() =>
    page.evaluate(() => Boolean(document.getElementById('share-button').dataset.url))
  );
  const url = await page.evaluate(() => document.getElementById('share-button').dataset.url);

  page.once('dialog', (dialog) => dialog.dismiss());
  await page.goto(url, { waitUntil: 'load' });
  await wait(600);

  assert.equal(await value(), 'keep = 1', 'the existing sheet survived the declined import');
  assert.equal(
    await page.evaluate(() => document.querySelectorAll('#tabs-bar [role="tab"]').length),
    1
  );
  assert.deepEqual(errors, []);
});

test('a corrupt share link reports itself instead of throwing', async () => {
  await newPage();
  const base = await page.evaluate(() => window.location.origin + window.location.pathname);
  await page.goto(`${base}#s=1.notavalidtokenatall`, { waitUntil: 'load' });
  await wait(600);
  assert.equal(
    await page.evaluate(() => document.getElementById('share-status').textContent),
    "That share link couldn't be read"
  );
  assert.equal(await page.evaluate(() => window.location.hash), '');
  assert.deepEqual(errors, []);
});

test('a first visit seeds the Welcome sheet', async () => {
  await newPage({ firstRun: true });
  await waitFor(() => page.evaluate(() => document.getElementById('total').textContent.length > 0));
  const state = await page.evaluate(() => ({
    tabName: document.querySelector('#tabs-bar .tab-name')?.textContent,
    rows: document.querySelectorAll('#view .line-row').length,
    total: document.getElementById('total').textContent,
    flag: localStorage.getItem('math-notes-onboarded'),
  }));
  assert.equal(state.tabName, 'Welcome');
  assert.ok(state.rows > 10, `the starter sheet rendered ${state.rows} rows`);
  assert.ok(state.total.length > 0, 'the starter sheet evaluates to a total');
  assert.equal(state.flag, '1', 'the flag is set up front, so a crash cannot loop onboarding');
  assert.deepEqual(errors, []);
});

test('a first-run seed is not repeated on reload', async () => {
  await newPage({ firstRun: true });
  await waitFor(() => page.evaluate(() => localStorage.getItem('math-notes-onboarded') === '1'));
  const seeded = await value();
  assert.ok(seeded.includes('Welcome!'), 'the Welcome sheet was seeded');
  await page.reload({ waitUntil: 'load' });
  await wait(600);
  assert.equal(await value(), seeded, 'the sheet was not seeded a second time');
  assert.equal(
    await page.evaluate(() => document.querySelectorAll('#tabs-bar [role="tab"]').length),
    1,
    'no extra tab was created'
  );
  assert.deepEqual(errors, []);
});

test('a returning visitor with existing tabs is never seeded', async () => {
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
  assert.equal(await value(), 'salary = 4200\nsalary / 12', 'their sheet survived untouched');
  assert.equal(
    await page.evaluate(() => document.querySelector('#tabs-bar .tab-name').textContent),
    'My work'
  );
  assert.deepEqual(errors, []);
});

test('Settings switches the interface language and remembers it', async () => {
  await newPage();
  await wait(300);
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
  assert.equal(
    await page.evaluate(() => document.getElementById('share-button').textContent),
    'Share'
  );

  await page.click('#settings-button');
  await wait(200);
  await page.click('.settings-language .measurement-card[data-lang="pt"]');
  await wait(200);

  assert.equal(await page.evaluate(() => document.documentElement.lang), 'pt');
  assert.equal(
    await page.evaluate(() => document.getElementById('share-button').textContent),
    'Compartilhar'
  );
  assert.equal(await page.evaluate(() => localStorage.getItem('math-notes-language')), 'pt');

  // The choice survives a reload.
  await page.reload({ waitUntil: 'load' });
  await wait(400);
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'pt');
  assert.equal(
    await page.evaluate(() => document.getElementById('share-button').textContent),
    'Compartilhar'
  );
  assert.deepEqual(errors, []);
});

test('the Examples content follows the language and its examples still work', async () => {
  await newPage();
  await page.click('#settings-button');
  await wait(150);
  await page.click('.settings-language .measurement-card[data-lang="es"]');
  await wait(150);
  await page.click('#settings-modal .modal-close');
  await wait(150);

  assert.equal(
    await page.evaluate(() => document.getElementById('recipes-button').textContent),
    'Ejemplos'
  );
  await page.click('#recipes-button');
  await waitFor(() =>
    page.evaluate(
      () =>
        document.querySelector('#recipes-modal .modal-section h2')?.textContent ===
        'Dividir la cuenta del restaurante'
    )
  );
  // The intro is translated too.
  assert.match(
    await page.evaluate(() => document.querySelector('#recipes-modal .modal-body > p').textContent),
    /Cálculos ya hechos/
  );
  // The example chips keep their (English) expressions across a swap.
  assert.match(
    await page.evaluate(
      () => document.querySelector('#recipes-modal .modal-section .example-chip code').textContent
    ),
    /bill = 120/
  );
  await page.click('#recipes-modal .modal-section .example-chip');
  await wait(200);
  assert.match(await value(), /bill = 120/);
  assert.deepEqual(errors, []);
});

test('the Examples chips are highlighted and multi-line examples get a line-number gutter', async () => {
  await newPage();
  await page.click('#recipes-button');
  await waitFor(() => page.$('#recipes-modal .example-chip code .number'));
  const highlighted = await page.$$eval(
    '#recipes-modal .example-chip code .number',
    (nodes) => nodes.length
  );
  assert.ok(highlighted > 0, 'example tokens are highlighted');

  const numbers = await page.$$eval('#recipes-modal .example-line-number', (nodes) =>
    nodes.map((node) => node.textContent)
  );
  assert.ok(numbers.length >= 2, 'multi-line examples show line numbers');
  assert.equal(numbers[0], '1');

  const layout = await page.evaluate(() => {
    const content = document.querySelector('#recipes-modal .example-line-content');
    const ten = [...document.querySelectorAll('#recipes-modal .example-chip')].find(
      (chip) => chip.querySelectorAll('.example-line').length >= 10
    );
    const code = ten ? ten.querySelector('code') : null;
    return {
      whiteSpace: getComputedStyle(content).whiteSpace,
      overflowX: code ? getComputedStyle(code).overflowX : null,
      gutter: code ? code.style.getPropertyValue('--example-gutter') : null,
    };
  });
  assert.equal(layout.whiteSpace, 'pre', 'examples do not wrap');
  assert.equal(layout.overflowX, 'auto', 'long examples scroll horizontally');
  assert.equal(layout.gutter, '2ch', 'the gutter widens for two-digit line numbers');
  assert.deepEqual(errors, []);
});

test('the UI is hidden until a non-English language is applied', async () => {
  if (context) await context.close();
  context = await browser.createBrowserContext();
  page = await context.newPage();
  errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  // Block the app so the language is never applied: the head script must keep
  // the English UI hidden in the meantime, so it never flashes.
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (request.url().endsWith('/js/index.js')) request.abort();
    else request.continue();
  });
  await page.evaluateOnNewDocument(() => localStorage.setItem('math-notes-language', 'pt'));
  await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'domcontentloaded' });
  await wait(150);
  const state = await page.evaluate(() => ({
    pending: document.documentElement.classList.contains('i18n-pending'),
    hidden: getComputedStyle(document.querySelector('.layout')).visibility === 'hidden',
  }));
  assert.equal(state.pending, true, 'the head script marks the pending language');
  assert.equal(state.hidden, true, 'the English UI is hidden until the language applies');
});

test('the documentation page renders highlighted examples and wires its actions', async () => {
  if (context) await context.close();
  context = await browser.createBrowserContext();
  page = await context.newPage();
  errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto(`http://localhost:${server.address().port}/docs/getting-started/`, {
    waitUntil: 'load',
  });
  await waitFor(() => page.$('.doc-example code .variable'));
  const state = await page.evaluate(() => ({
    examples: document.querySelectorAll('.doc-example').length,
    variables: document.querySelectorAll('.doc-example code .variable').length,
    lineNumbers: document.querySelectorAll('.doc-example .doc-line-number').length,
    copyLabels: [...document.querySelectorAll('[data-action="copy"]')].map((n) => n.textContent),
    navLinks: document.querySelectorAll('.doc-nav a').length,
    heading: document.querySelector('.doc-content h1').textContent,
  }));
  assert.ok(state.examples > 0);
  assert.ok(state.variables > 0, 'examples are colorized with the app highlighter');
  assert.ok(state.lineNumbers >= state.examples, 'every example line carries a number');
  assert.ok(state.navLinks > 5);
  assert.equal(state.heading, 'Getting started');
  assert.deepEqual(errors, []);
});

test('the service worker is registered from the site root so it controls the app', async () => {
  await newPage();
  const scope = await page.evaluate(async () => {
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
    return registration ? registration.scope : null;
  });
  assert.equal(
    scope,
    `http://localhost:${server.address().port}/`,
    'the worker must control the whole origin, not just /js/'
  );
});

test('the documentation headings anchor and the sidebar tracks scrolling', async () => {
  await newPage();
  await page.goto(`http://localhost:${server.address().port}/docs/getting-started/`, {
    waitUntil: 'load',
  });
  await waitFor(() => page.$('.doc-anchor'));

  const anchors = await page.$$eval('.doc-anchor', (nodes) =>
    nodes.map((node) => ({
      href: node.getAttribute('href'),
      id: node.closest('h2, h3')?.id,
    }))
  );
  assert.ok(anchors.length >= 5, 'every heading carries an anchor');
  assert.ok(
    anchors.every((anchor) => anchor.href === `#${anchor.id}`),
    'each anchor links to its own heading'
  );

  const initial = await page.$eval('.doc-nav-sub a.is-active', (node) => node.textContent);
  assert.equal(initial, 'The screen');
  // Disable smooth scrolling so the jump settles immediately.
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  await page.evaluate(() => document.getElementById('editing').scrollIntoView());
  await wait(250);
  const scrolled = await page.$eval('.doc-nav-sub a.is-active', (node) => node.textContent);
  assert.equal(scrolled, 'Editing', 'the sidebar highlights the section in view');
  assert.deepEqual(errors, []);
});

test('the documentation search filters the generated index', async () => {
  await newPage();
  await page.goto(`http://localhost:${server.address().port}/docs/groups/`, {
    waitUntil: 'load',
  });
  await page.type('.doc-search-input', 'aggregate keywords');
  await waitFor(() => page.$('.doc-search-result'));

  const first = await page.$eval(
    '.doc-search-result .doc-search-title',
    (node) => node.textContent
  );
  assert.equal(first, 'Aggregate keywords');
  const href = await page.$eval('.doc-search-result', (node) => node.getAttribute('href'));
  assert.equal(href, '/docs/groups/#aggregate-keywords');
  assert.deepEqual(errors, []);
});

test('the main-thread engine renders when the evaluation worker cannot load', async () => {
  if (context) await context.close();
  context = await browser.createBrowserContext();
  page = await context.newPage();
  errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  // Make the worker script fail as it would offline when its module graph was
  // never cached; the app must fall back to the main-thread evaluator.
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (request.url().endsWith('/js/worker.js')) request.abort();
    else request.continue();
  });
  await page.evaluateOnNewDocument(() => localStorage.setItem('math-notes-onboarded', '1'));
  await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'load' });
  await wait(400);

  await setContent('2 * 21');
  await wait(800);
  assert.match(
    await page.evaluate(() => document.getElementById('view').textContent),
    /42/,
    'the sheet still evaluates without the worker'
  );
  assert.deepEqual(errors, []);
});
