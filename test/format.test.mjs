import { test } from 'node:test';
import assert from 'node:assert/strict';

class ClassList {
  constructor(el) { this.el = el; }
  add(...names) { names.forEach(name => this.el._classes.add(name)); }
}
class El {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this._classes = new Set();
    this.classList = new ClassList(this);
    this.children = [];
    this.textContent = '';
  }
  appendChild(child) { this.children.push(child); return child; }
}
globalThis.document = {
  createElement: tag => new El(tag),
  createTextNode: text => ({ nodeType: 3, textContent: String(text) })
};

const format = (await import('../js/format.js')).default;
const renderInput = (await import('../js/renderInput.js')).default;

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
  assert.equal(view.children.length, 5);
  assert.equal(view.children[0]._classes.has('line'), true);
  assert.equal(view.children[4]._classes.has('line'), true);
});

test('identifiers, numbers and operators get their own classes', () => {
  const node = format.line('pizzas = 2');
  const classes = node.children.filter(c => c._classes).map(c => c.textContent);
  assert.deepEqual(classes, ['pizzas', '=', '2']);
});
