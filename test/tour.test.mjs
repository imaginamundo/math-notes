import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextStep, placeFor, STEPS } from '../js/ui/tour.js';
import { isFirstRun, STARTER_SHEET } from '../js/ui/onboarding.js';

const viewport = { width: 1000, height: 800 };
const popover = { width: 300, height: 160 };

test('nextStep moves one step at a time', () => {
  assert.equal(nextStep(0, 1, 5), 1);
  assert.equal(nextStep(3, -1, 5), 2);
});

test('nextStep clamps at both ends instead of wrapping', () => {
  assert.equal(nextStep(0, -1, 5), 0, 'no negative index');
  assert.equal(nextStep(4, 1, 5), 4, 'no run past the end');
  assert.equal(nextStep(99, 1, 5), 4);
  assert.equal(nextStep(-99, -1, 5), 0);
});

test('nextStep tolerates a nonsense index', () => {
  for (const bad of [NaN, undefined, null, 'x']) {
    assert.equal(nextStep(bad, 1, 5), 0, `index: ${bad}`);
  }
  assert.equal(nextStep(2, 0, 5), 2, 'no direction is a no-op');
});

test('every step names an anchor, a title, a body and a placement', () => {
  assert.ok(STEPS.length >= 5);
  for (const step of STEPS) {
    const anchors = Array.isArray(step.anchor) ? step.anchor : [step.anchor];
    assert.ok(anchors.length > 0, 'at least one anchor');
    for (const anchor of anchors) {
      assert.ok(anchor.startsWith('#') || anchor.startsWith('.'), anchor);
    }
    assert.ok(step.title.length > 0);
    assert.ok(step.body.length > 20);
    assert.ok(['top', 'bottom'].includes(step.placement), step.placement);
  }
});

test('placeFor centres the popover under a top anchor', () => {
  const placed = placeFor(
    { top: 0, left: 400, width: 200, height: 40 },
    popover,
    viewport,
    'bottom'
  );
  assert.equal(placed.placement, 'bottom');
  assert.equal(placed.top, 52, 'below the anchor plus the gap');
  assert.equal(placed.left, 350, 'centred on the anchor');
});

test('placeFor flips to the top when there is no room below', () => {
  const anchor = { top: 700, left: 400, width: 200, height: 40 };
  const placed = placeFor(anchor, popover, viewport, 'bottom');
  assert.equal(placed.placement, 'top');
  assert.equal(placed.top, 700 - 160 - 12);
});

test('placeFor flips to the bottom when there is no room above', () => {
  const anchor = { top: 10, left: 400, width: 200, height: 40 };
  const placed = placeFor(anchor, popover, viewport, 'top');
  assert.equal(placed.placement, 'bottom');
  assert.equal(placed.top, 62);
});

test('placeFor keeps the preferred side when both fit', () => {
  const anchor = { top: 400, left: 400, width: 200, height: 40 };
  assert.equal(placeFor(anchor, popover, viewport, 'top').placement, 'top');
  assert.equal(placeFor(anchor, popover, viewport, 'bottom').placement, 'bottom');
});

test('placeFor clamps horizontally at both edges', () => {
  const left = placeFor({ top: 100, left: 0, width: 20, height: 20 }, popover, viewport, 'bottom');
  assert.equal(left.left, 8, 'never off the left edge');
  const right = placeFor(
    { top: 100, left: 990, width: 20, height: 20 },
    popover,
    viewport,
    'bottom'
  );
  assert.equal(right.left, viewport.width - popover.width - 8, 'never off the right edge');
});

test('placeFor keeps a popover taller than the viewport on screen', () => {
  const tall = { width: 300, height: 900 };
  const placed = placeFor(
    { top: 400, left: 400, width: 100, height: 40 },
    tall,
    viewport,
    'bottom'
  );
  assert.equal(placed.top, 8, 'clamped to the top margin rather than pushed off-screen');
});

test('placeFor never returns a non-finite coordinate', () => {
  const placed = placeFor(
    { top: 0, left: 0, width: 0, height: 0 },
    { width: 0, height: 0 },
    viewport,
    'bottom'
  );
  assert.ok(Number.isFinite(placed.top) && Number.isFinite(placed.left));
});

// --- First-run detection ---------------------------------------------------

test('isFirstRun requires all three conditions', () => {
  assert.equal(isFirstRun({ onboarded: null, tabs: null, content: '' }), true);
  assert.equal(isFirstRun({ onboarded: null, tabs: null, content: '   \n  ' }), true);
});

test('isFirstRun is false once the flag is set', () => {
  assert.equal(isFirstRun({ onboarded: '1', tabs: null, content: '' }), false);
});

test('isFirstRun never overwrites an existing user', () => {
  // Someone who cleared only the onboarding flag still has tabs, or content,
  // or both — seeding over either would destroy their work.
  assert.equal(isFirstRun({ onboarded: null, tabs: '[{"id":"a"}]', content: '' }), false);
  assert.equal(isFirstRun({ onboarded: null, tabs: null, content: '1 + 1' }), false);
  assert.equal(isFirstRun({ onboarded: null, tabs: '[]', content: 'x = 2' }), false);
});

test('the starter sheet is a short, working tutorial', () => {
  const lines = STARTER_SHEET.split('\n');
  assert.ok(lines.length <= 20, `starter sheet is ${lines.length} lines`);
  assert.ok(STARTER_SHEET.includes('sum'));
  assert.ok(STARTER_SHEET.includes('prev'));
});
