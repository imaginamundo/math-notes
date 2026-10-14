import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ratchet } from './helpers/ratchet.mjs';

// Text drawn on the editor background must reach WCAG AA (4.5:1) in every
// theme: the syntax colours, and the dimmed inline results (a translucent
// colour, so it is composited over the background first).
const css = readFileSync(fileURLToPath(new URL('../style.css', import.meta.url)), 'utf8');
const TEXT_TOKENS = [
  '--color-ghost',
  '--color-ghost-error',
  '--color-variable',
  '--color-number',
  '--color-operator',
  '--color-currency',
  '--color-title',
];
const AA = 4.5;

function themes() {
  const found = {};
  for (const block of css.matchAll(/(?:^|\n)(:root|html\[data-theme='[\w-]+'\])\s*\{([^}]*)\}/g)) {
    found[block[1]] ??= {};
    for (const decl of block[2].matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
      found[block[1]][decl[1]] = decl[2].trim();
    }
  }
  return found;
}

function parseColor(value) {
  let m = /^#([0-9a-f]{6})$/i.exec(value);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
  m = /^#([0-9a-f]{3})$/i.exec(value);
  if (m) return [0, 1, 2].map((i) => parseInt(m[1][i] + m[1][i], 16)).concat(1);
  m = /^rgba?\(([^)]+)\)$/.exec(value);
  if (m) {
    const [r, g, b, a = 1] = m[1].split(',').map(Number);
    return [r, g, b, a];
  }
  return null;
}

const luminance = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

function contrast(foreground, background) {
  const [r, g, b, a] = foreground;
  const mixed = [r, g, b].map((v, i) => v * a + background[i] * (1 - a));
  const [hi, lo] = [luminance(mixed), luminance(background)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('the theme parser finds the root and every named theme', () => {
  const names = Object.keys(themes());
  assert.ok(names.includes(':root'));
  assert.ok(names.length >= 5, `expected the default and four themes, found ${names}`);
});

test('contrast reads known pairs correctly', () => {
  assert.equal(contrast([0, 0, 0, 1], [255, 255, 255]).toFixed(1), '21.0');
  assert.equal(contrast([255, 255, 255, 1], [255, 255, 255]).toFixed(1), '1.0');
  assert.ok(contrast([0, 0, 0, 0.5], [255, 255, 255]) < contrast([0, 0, 0, 0.9], [255, 255, 255]));
});

test('editor text reaches WCAG AA contrast in every theme', () => {
  const all = themes();
  const failures = [];
  for (const [name, own] of Object.entries(all)) {
    const vars = { ...all[':root'], ...own };
    const background = parseColor(vars['--color-primary']);
    assert.ok(background, `${name} has no readable --color-primary`);
    for (const token of TEXT_TOKENS) {
      const color = parseColor(vars[token] ?? '');
      assert.ok(color, `${name} has no readable ${token}`);
      const ratio = contrast(color, background);
      if (ratio < AA) failures.push(`${name} ${token}: ${ratio.toFixed(2)}:1`);
    }
  }
  assert.deepEqual(failures, []);
});

// Resolve one theme's variables (the default theme's, overridden by its own).
function themeVars(name) {
  const all = themes();
  return { ...all[':root'], ...all[name] };
}

// Results and errors are drawn on a chip (`.ghost-result`), not on the editor
// background, so that is what they must be measured against (REVIEW.md UIE-10).
test('results and errors reach AA on the chip they are drawn on, in every theme', () => {
  const failures = [];
  for (const name of Object.keys(themes())) {
    const vars = themeVars(name);
    const chip = parseColor(vars['--color-footer']);
    assert.ok(chip, `${name} has no readable --color-footer`);
    for (const token of ['--color-ghost', '--color-ghost-error']) {
      const ratio = contrast(parseColor(vars[token]), chip);
      if (ratio < AA) failures.push(`${name} ${token} on the result chip: ${ratio.toFixed(2)}:1`);
    }
  }
  assert.deepEqual(failures, []);
});

// Text the stylesheet dims with `opacity` (comments, gutter numbers, placeholder)
// is measured as its colour at that opacity over the surface behind it
// (REVIEW.md UIE-19). Several themes are not there yet, so this is a ratchet.
const DIMMED = [
  { label: 'comment', token: '--color-text', opacity: 0.5, surface: '--color-primary' },
  { label: 'gutter number', token: '--color-text', opacity: 0.55, surface: '--color-surface' },
  { label: 'placeholder', token: '--color-text', opacity: 0.55, surface: '--color-primary' },
];

test('dimmed text keeps AA contrast (ratchet: UIE-19)', () => {
  const failing = [];
  for (const name of Object.keys(themes())) {
    const vars = themeVars(name);
    for (const { label, token, opacity, surface } of DIMMED) {
      const [r, g, b] = parseColor(vars[token]);
      const ratio = contrast([r, g, b, opacity], parseColor(vars[surface]));
      if (ratio < AA) failing.push(`${name} ${label}`);
    }
  }
  ratchet('contrast-dimmed', failing);
});
