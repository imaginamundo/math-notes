// Generates the committed share/PWA imagery with puppeteer:
//
//   images/og-cover.png                 1200 x 630  Open Graph / Twitter card
//   images/icons/icon-512-maskable.png   512 x 512  maskable PWA icon
//   images/screenshots/wide.png         1280 x 720  manifest screenshot (wide)
//   images/screenshots/narrow.png        720 x 1280 manifest screenshot (narrow)
//
// There is no build step at deploy time, so the outputs are committed. Run
// `npm run build:og` after changing the palette in style.css or the app shell.
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const root = fileURLToPath(new URL('..', import.meta.url));

// Pulled from the default (One Dark) theme block in style.css.
const THEME = {
  primary: '#282c34',
  surface: '#2f343d',
  text: '#abb2bf',
  textStrong: '#c0c7d1',
  ghost: 'rgba(255, 255, 255, 0.5)',
  variable: '#e87884',
  number: '#d19a66',
  operator: '#56b6c2',
  currency: '#98c379',
  comment: '#7f8796',
  footer: '#1f232b',
};

const SAMPLE = [
  { code: '# groceries', kind: 'comment' },
  { code: 'bread = 4.20 EUR', result: '4.20 EUR' },
  { code: 'coffee = 12 EUR', result: '12 EUR' },
  { code: 'sum', result: '16.20 EUR' },
  { code: '15% of 240', result: '36' },
  { code: '2 days + 4 h in hours', result: '52 hours' },
];

// Single pass, mirroring the rule order in js/render/format.js. Chained
// `String.replace` calls cannot be used here: a later rule would match inside
// the markup an earlier rule just inserted.
const TOKENS = [
  ['c-num', /^\d*\.?\d+/],
  ['c-op', /^[+\-*/^=(),%]/],
  ['c-var', /^[A-Za-z_][A-Za-z0-9_]*/],
];

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlight(code) {
  let rest = code;
  let out = '';
  while (rest) {
    const space = rest.match(/^\s+/);
    if (space) {
      out += escapeHtml(space[0]);
      rest = rest.slice(space[0].length);
      continue;
    }
    let matched = false;
    for (const [className, pattern] of TOKENS) {
      const token = rest.match(pattern);
      if (!token) continue;
      out += `<span class="${className}">${escapeHtml(token[0])}</span>`;
      rest = rest.slice(token[0].length);
      matched = true;
      break;
    }
    if (matched) continue;
    out += escapeHtml(rest[0]);
    rest = rest.slice(1);
  }
  return out;
}

function sheetMarkup() {
  return SAMPLE.map((line) => {
    const code =
      line.kind === 'comment'
        ? `<span class="c-comment">${escapeHtml(line.code)}</span>`
        : highlight(line.code);
    const ghost = line.result ? `<span class="ghost">→ ${escapeHtml(line.result)}</span>` : '';
    return `<div class="row">${code}${ghost}</div>`;
  }).join('');
}

function coverHtml(width, height) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${width}px;height:${height}px;background:${THEME.primary};color:${THEME.text};
    font-family:'DejaVu Sans Mono','Liberation Mono',monospace;display:flex;flex-direction:column;
    justify-content:center;gap:34px;padding:64px 72px;overflow:hidden}
  h1{font-size:76px;letter-spacing:-2px;color:${THEME.textStrong};font-weight:700}
  p{font-size:28px;white-space:nowrap;color:${THEME.ghost}}
  .sheet{background:${THEME.surface};border-radius:18px;padding:30px 36px;font-size:29px;
    line-height:1.75;box-shadow:0 18px 60px rgba(0,0,0,.45)}
  .row{white-space:pre}
  .ghost{color:${THEME.ghost};padding-left:1.2em}
  .c-var{color:${THEME.variable}} .c-num{color:${THEME.number}}
  .c-op{color:${THEME.operator}} .c-comment{color:${THEME.comment}}
  .bar{height:8px;border-radius:4px;background:linear-gradient(90deg,${THEME.variable},${THEME.number},${THEME.currency},${THEME.operator})}
  </style></head><body>
  <div class="bar"></div>
  <div><h1>Math Notes</h1><p>Inline calculator for the browser. No sign-up, works offline.</p></div>
  <div class="sheet">${sheetMarkup()}</div>
  </body></html>`;
}

// Maskable icons must keep their artwork inside the inner 80% safe area,
// because the OS may crop the outer ring to any shape.
function maskableHtml(size) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${size}px;height:${size}px;background:${THEME.primary};display:flex;
    align-items:center;justify-content:center;
    font-family:'DejaVu Sans Mono','Liberation Mono',monospace}
  .safe{width:80%;height:80%;display:flex;align-items:center;justify-content:center;
    flex-direction:column;gap:${size * 0.03}px}
  .glyph{font-size:${size * 0.3}px;font-weight:700;color:${THEME.operator};letter-spacing:-2px}
  .eq{font-size:${size * 0.22}px;color:${THEME.number};font-weight:700}
  </style></head><body><div class="safe">
    <div class="glyph">1+2</div><div class="eq">= 3</div>
  </div></body></html>`;
}

function startServer() {
  const MIME = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.ico': 'image/x-icon',
    '.png': 'image/png',
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
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

async function shotHtml(browser, html, width, height, out) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  const buffer = await page.screenshot({ type: 'png' });
  await writeFile(join(root, out), buffer);
  await page.close();
  console.log(`wrote ${out} (${width}x${height})`);
}

// Screenshots are taken against the real app so the manifest never advertises
// a mock-up that has drifted from the shipped UI.
async function shotApp(browser, origin, width, height, out) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(origin, { waitUntil: 'load' });
  await page.evaluate(() => {
    const editor = document.getElementById('content-editable');
    // No currency lines: the screenshot runs offline, so live exchange
    // rates are unavailable and every converted line would render an error.
    editor.value = [
      '# monthly budget',
      'rent: 1200',
      'food: 380',
      'transport: 74',
      'sum',
      '',
      '15% of 240',
      '3 days + 4 hours in hours',
      '(1920 * 1080) / 1e6',
    ].join('\n');
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 800));
  const buffer = await page.screenshot({ type: 'png' });
  await writeFile(join(root, out), buffer);
  await page.close();
  console.log(`wrote ${out} (${width}x${height})`);
}

const server = await startServer();
const origin = `http://localhost:${server.address().port}/`;
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  await mkdir(join(root, 'images/screenshots'), { recursive: true });
  await shotHtml(browser, coverHtml(1200, 630), 1200, 630, 'images/og-cover.png');
  await shotHtml(browser, maskableHtml(512), 512, 512, 'images/icons/icon-512-maskable.png');
  await shotApp(browser, origin, 1280, 720, 'images/screenshots/wide.png');
  await shotApp(browser, origin, 720, 1280, 'images/screenshots/narrow.png');
} finally {
  await browser.close();
  server.close();
}
