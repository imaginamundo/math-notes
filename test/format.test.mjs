import { test } from 'node:test';
import assert from 'node:assert/strict';

class ClassList {
  constructor(el) {
    this.el = el;
  }
  add(...names) {
    names.forEach((name) => this.el._classes.add(name));
  }
}
class El {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this._classes = new Set();
    this.classList = new ClassList(this);
    this.children = [];
    this.textContent = '';
  }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
}
globalThis.document = {
  createElement: (tag) => new El(tag),
  createTextNode: (text) => ({ nodeType: 3, textContent: String(text) }),
};

const format = (await import('../js/render/format.js')).default;
const renderInput = (await import('../js/render/renderInput.js')).default;

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
  renderInput(view, ['1 + 1 # one', '2 + 2 # two', '3 + 3']);
  assert.equal(view.children.length, 3);
  assert.equal(view.children[0].className, 'line-row');
  assert.equal(view.children[0].children[0]._classes.has('line'), true);
  assert.equal(view.children[2].children[0]._classes.has('line'), true);
});

test('renderInput appends inline ghost results', () => {
  const view = new El('pre');
  renderInput(
    view,
    ['1 + 1', 'x = 5', '2 +', ''],
    [
      { type: 'value', value: 2 },
      { type: 'assignment', value: 5 },
      { type: 'error', value: 'Undefined symbol x' },
      { type: 'value', value: undefined },
    ]
  );
  const ghosts = view.children
    .flatMap((row) => row.children)
    .filter((child) => child.className && child.className.includes('ghost-result'));
  assert.equal(ghosts.length, 2);
  assert.equal(ghosts[0].textContent, '→ 2');
  assert.equal(ghosts[1].className, 'ghost-result error');
  assert.equal(ghosts[1].textContent, 'Undefined symbol x');
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

test('renderInput draws an unchanged sheet that has never been drawn', () => {
  // startLine === -1 means "unchanged since the last evaluation". If an
  // earlier render was gated out as stale, the view is still empty and the
  // rows must be drawn anyway — otherwise nothing ever renders them.
  const view = new El('pre');
  renderInput(
    view,
    ['1 + 1', '2 + 2'],
    [
      { type: 'value', value: 2 },
      { type: 'value', value: 4 },
    ],
    -1
  );
  assert.equal(view.children.length, 2);

  // Once drawn, -1 really is a no-op: the rows are left untouched.
  const drawn = view.children[0];
  renderInput(
    view,
    ['1 + 1', '2 + 2'],
    [
      { type: 'value', value: 2 },
      { type: 'value', value: 4 },
    ],
    -1
  );
  assert.equal(view.children.length, 2);
  assert.equal(view.children[0], drawn, 'the existing rows were reused');
});
