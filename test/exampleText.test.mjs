import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indentGroupBodies } from '../js/render/exampleText.js';

test('indentGroupBodies indents a group body but not its header or end', () => {
  assert.equal(indentGroupBodies('Groceries:\n4.50\n3.20\nend'), 'Groceries:\n  4.50\n  3.20\nend');
});

test('indentGroupBodies leaves lines after a group alone', () => {
  const input = 'At the bar:\npotato: 20 #name1\nbeer: 160 #name1\nend\n\n#name1\n#name2';
  assert.equal(
    indentGroupBodies(input),
    'At the bar:\n  potato: 20 #name1\n  beer: 160 #name1\nend\n\n#name1\n#name2'
  );
});

test('indentGroupBodies keeps blank lines empty and skips colon labels', () => {
  assert.equal(indentGroupBodies('Price: 10 + 5'), 'Price: 10 + 5');
  assert.equal(indentGroupBodies('Trip:\n10 cm\n\n1 m\nend'), 'Trip:\n  10 cm\n\n  1 m\nend');
});
