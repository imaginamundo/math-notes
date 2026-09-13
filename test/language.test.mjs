import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLanguage, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../js/core/language.js';
import { t, detectLanguage, setLocale, getLocale } from '../js/i18n/index.js';
import en from '../js/i18n/ui/en.js';
import pt from '../js/i18n/ui/pt.js';
import es from '../js/i18n/ui/es.js';

test('normalizeLanguage maps a tag to a supported base', () => {
  assert.deepEqual(SUPPORTED_LANGUAGES, ['en', 'pt', 'es']);
  assert.equal(DEFAULT_LANGUAGE, 'en');
  assert.equal(normalizeLanguage('pt-BR'), 'pt');
  assert.equal(normalizeLanguage('es-419'), 'es');
  assert.equal(normalizeLanguage('en_US'), 'en');
  assert.equal(normalizeLanguage('fr'), 'en');
  assert.equal(normalizeLanguage(''), 'en');
  assert.equal(normalizeLanguage(undefined), 'en');
});

test('detectLanguage picks the first supported system language', () => {
  assert.equal(detectLanguage(['fr-FR', 'pt-BR', 'en']), 'pt');
  assert.equal(detectLanguage(['de', 'es']), 'es');
  assert.equal(detectLanguage(['ja', 'ko']), 'en');
  assert.equal(detectLanguage([]), 'en');
});

test('t interpolates and unknown keys fall back to the key', () => {
  const original = getLocale();
  try {
    setLocale('en');
    assert.equal(t('footer.share'), 'Share');
    assert.equal(t('tabs.defaultName', { n: 3 }), 'Tab 3');
    setLocale('pt');
    assert.equal(t('footer.share'), 'Compartilhar');
    assert.equal(t('tabs.defaultName', { n: 3 }), 'Aba 3');
    assert.equal(getLocale(), 'pt');
    assert.equal(t('does.not.exist'), 'does.not.exist');
  } finally {
    setLocale(original, { persist: false });
  }
});

test('every locale has the same keys as English', () => {
  const keys = Object.keys(en).sort();
  for (const [name, dict] of [
    ['pt', pt],
    ['es', es],
  ]) {
    assert.deepEqual(Object.keys(dict).sort(), keys, `${name} keys differ from en`);
  }
});
