import { test } from 'node:test';
import assert from 'node:assert/strict';

class ClassList {
  constructor(el) {
    this.el = el;
  }
  add(...names) {
    names.forEach((name) => this.el._classes.add(name));
  }
  contains(name) {
    return (
      this.el._classes.has(name) ||
      String(this.el.className || '')
        .split(/\s+/)
        .includes(name)
    );
  }
  toggle(name, force) {
    const on = force === undefined ? !this.contains(name) : Boolean(force);
    if (on) this.el._classes.add(name);
    else this.el._classes.delete(name);
  }
}
class El {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this._classes = new Set();
    this.classList = new ClassList(this);
    this.dataset = {};
    this.children = [];
    this.textContent = '';
  }
  appendChild(child) {
    child._parent = this;
    this.children.push(child);
    return child;
  }
  get firstChild() {
    return this.children[0] || null;
  }
  replaceChild(newChild, oldChild) {
    const index = this.children.indexOf(oldChild);
    if (index === -1) return oldChild;
    this.children[index] = newChild;
    newChild._parent = this;
    oldChild._parent = null;
    return oldChild;
  }
  remove() {
    if (!this._parent) return;
    const index = this._parent.children.indexOf(this);
    if (index !== -1) this._parent.children.splice(index, 1);
    this._parent = null;
  }
}
globalThis.document = {
  createElement: (tag) => new El(tag),
  createTextNode: (text) => ({ nodeType: 3, textContent: String(text) }),
};

const format = (await import('../js/render/format.js')).default;
const { createRowRenderer } = await import('../js/render/renderInput.js');

test('a line with a comment renders without throwing', () => {
  const node = format.line('1 + 1 # hello');
  assert.ok(node);
  assert.equal(node.children[0]._classes.has('number'), true);
});

test('a comment-only line renders the comment', () => {
  const node = format.line('# only a comment');
  assert.equal(node.children.length, 1);
  assert.equal(node.children[0]._classes.has('comment'), true);
  assert.equal(node.children[0].textContent, '# only a comment');
});

test('comment rendering does not drop following lines', () => {
  const view = new El('pre');
  createRowRenderer(view).renderText(['1 + 1 # one', '2 + 2 # two', '3 + 3']);
  assert.equal(view.children.length, 3);
  assert.equal(view.children[0].className, 'line-row');
  assert.equal(view.children[0].children[0]._classes.has('line'), true);
  assert.equal(view.children[2].children[0]._classes.has('line'), true);
});

test('two-phase rendering fills ghost results into rows', () => {
  const view = new El('pre');
  const renderer = createRowRenderer(view);
  const lines = ['1 + 1', 'x = 5', '2 +', ''];
  const results = [
    { type: 'value', value: 2 },
    { type: 'assignment', value: 5 },
    { type: 'error', value: 'Undefined symbol x' },
    { type: 'value', value: undefined },
  ];

  renderer.renderText(lines);
  const ghostsBefore = view.children
    .flatMap((row) => row.children)
    .filter((child) => child.className && child.className.includes('ghost-result'));
  assert.equal(ghostsBefore.length, 0, 'text renders with no results yet');

  renderer.patchResults(lines, results, 0);
  const ghosts = view.children
    .flatMap((row) => row.children)
    .filter((child) => child.className && child.className.includes('ghost-result'));
  assert.equal(ghosts.length, 2);
  assert.equal(ghosts[0].className, 'ghost-result');
  assert.equal(ghosts[0].textContent, '→ 2');
  assert.equal(ghosts[1].className, 'ghost-result error');
  assert.equal(ghosts[1].textContent, 'Undefined symbol x');
});

test('updateActiveLine reveals a truncated error on the caret row', () => {
  const view = new El('pre');
  const renderer = createRowRenderer(view);
  const longError = 'Undefined symbol something'.padEnd(120, '!');
  renderer.renderText(['boom']);
  renderer.patchResults(['boom'], [{ type: 'error', value: longError }], 0);
  const ghost = view.children[0].children[1];
  assert.ok(ghost.textContent.endsWith('…'), 'error is truncated inline');
  assert.equal(ghost.dataset.full, longError);

  renderer.updateActiveLine(0);
  assert.equal(ghost.textContent, longError, 'the active row shows the full error');
  renderer.updateActiveLine(-1);
  assert.ok(ghost.textContent.endsWith('…'), 'leaving the row collapses it again');
});

test('identifiers, numbers and operators get their own classes', () => {
  const node = format.line('pizzas = 2');
  const classes = node.children.filter((c) => c._classes).map((c) => c.textContent);
  assert.deepEqual(classes, ['pizzas', '=', '2']);
});

test('currency symbols get their own class', () => {
  const node = format.line('R$5 to EUR');
  const classes = node.children
    .filter((c) => c._classes)
    .map((c) => ({ text: c.textContent, class: [...c._classes][0] }));
  assert.deepEqual(classes, [
    { text: 'R$', class: 'currency' },
    { text: '5', class: 'number' },
    { text: 'to', class: 'variable' },
    { text: 'EUR', class: 'variable' },
  ]);
});

test('a bare dollar sign is highlighted as currency', () => {
  const node = format.line('$5');
  assert.equal(node.children[0]._classes.has('currency'), true);
  assert.equal(node.children[0].textContent, '$');
  assert.equal(node.children[1]._classes.has('number'), true);
  assert.equal(node.children[1].textContent, '5');
});

test('a colon label renders as a title', () => {
  const node = format.line('Price: 1 + 1');
  assert.equal(node.children[0]._classes.has('title'), true);
  assert.equal(node.children[0].textContent, 'Price:');
});

test('format.line renders colon labels exactly as typed', () => {
  for (const line of ['Price: 10 + 5', 'Price : 10 + 5', 'Price:10 + 5', 'Price: 10 + 5 # note']) {
    const node = format.line(line);
    const text = node.children.map((child) => child.textContent).join('');
    assert.equal(text, line);
  }
});

test('patchResults fills an unchanged sheet that has never had results', () => {
  // startLine === -1 means "unchanged since the last evaluation". If an
  // earlier render was gated out as stale, the rows are still pending and the
  // results must be applied anyway — otherwise nothing ever renders them.
  const view = new El('pre');
  const renderer = createRowRenderer(view);
  const lines = ['1 + 1', '2 + 2'];
  const results = [
    { type: 'value', value: 2 },
    { type: 'value', value: 4 },
  ];
  renderer.renderText(lines);
  assert.equal(view.children.length, 2);

  renderer.patchResults(lines, results, -1);
  const ghosts = view.children
    .flatMap((row) => row.children)
    .filter((child) => child.className && child.className.includes('ghost-result'));
  assert.equal(ghosts.length, 2);

  // Once patched, -1 really is a no-op: the rows are left untouched.
  const drawn = view.children[0];
  renderer.patchResults(lines, results, -1);
  assert.equal(view.children.length, 2);
  assert.equal(view.children[0], drawn, 'the existing rows were reused');
});

test('a group end line is styled like a label', () => {
  const node = format.line('end');
  assert.equal(node.children[0]._classes.has('title'), true);
  assert.equal(node.children[0].textContent, 'end');
});

test('editing one line reuses every other row', () => {
  const view = new El('pre');
  const renderer = createRowRenderer(view);
  renderer.renderText(['1 + 1', '2 + 2', '3 + 3']);
  const unchanged = view.children[1];
  const editedLine = view.children[0].children[0];

  renderer.renderText(['9 + 9', '2 + 2', '3 + 3']);
  assert.equal(view.children[1], unchanged, 'unchanged rows are reused');
  assert.notEqual(view.children[0].children[0], editedLine, 'the edited line is redrawn');
  assert.equal(view.children[0].children[0].children[0].textContent, '9');
});

test('patchResults refreshes a group header above the edited line', () => {
  const view = new El('pre');
  const renderer = createRowRenderer(view);
  const lines = ['Groceries:', '10', 'end'];
  renderer.renderText(lines);
  renderer.patchResults(
    lines,
    [
      { type: 'value', value: 10, aggregate: true, group: 'header' },
      { type: 'value', value: 10, group: 'body' },
      { type: 'value', value: undefined, group: 'end' },
    ],
    0
  );
  assert.equal(view.children[0].children[1].textContent, '→ 10');

  // The body changed (dirtyFrom = 1) but the engine starts at the header (0).
  const next = ['Groceries:', '20', 'end'];
  renderer.renderText(next);
  renderer.patchResults(
    next,
    [
      { type: 'value', value: 20, aggregate: true, group: 'header' },
      { type: 'value', value: 20, group: 'body' },
      { type: 'value', value: undefined, group: 'end' },
    ],
    0
  );
  assert.equal(view.children[0].children[1].textContent, '→ 20');
});

test('group results add shading classes to their rows', () => {
  const view = new El('pre');
  const renderer = createRowRenderer(view);
  const lines = ['Groceries:', '10', 'end'];
  renderer.renderText(lines);
  renderer.patchResults(
    lines,
    [
      { type: 'value', value: 10, aggregate: true, group: 'header' },
      { type: 'value', value: 10, group: 'body' },
      { type: 'value', value: undefined, group: 'end' },
    ],
    0
  );
  assert.equal(view.children[0].classList.contains('group-header'), true);
  assert.equal(view.children[1].classList.contains('group-body'), true);
  assert.equal(view.children[2].classList.contains('group-end'), true);

  // Losing the group clears the shading again.
  renderer.patchResults(
    lines,
    [{ type: 'value', value: 10 }, { type: 'value', value: 10 }, { type: 'value' }],
    0
  );
  assert.equal(view.children[0].classList.contains('group-header'), false);
  assert.equal(view.children[1].classList.contains('group-body'), false);
  assert.equal(view.children[2].classList.contains('group-end'), false);
});
