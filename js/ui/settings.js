import initModal from './modal.js';
import storage from '../util/storage.js';
import { ONBOARDED_KEY } from './onboarding.js';
import { DISMISSED_KEY } from './starterPrompt.js';
import { FONT_KEY } from './cosmetic.js';
import { STORAGE_KEY as TABS_KEY, LEGACY_KEY as LEGACY_TABS_KEY } from './tabs.js';
import { STORAGE_KEY as CURRENCY_KEY } from '../eval/currency.js';
import { MEASUREMENT_SYSTEMS } from '../core/measures.js';
import { SUPPORTED_LANGUAGES, STORAGE_KEY as LANGUAGE_KEY } from '../core/language.js';
import { STORAGE_KEY as TOTAL_MODE_KEY } from '../core/totalMode.js';
import {
  STORAGE_KEY as MEASUREMENT_KEY,
  readMeasurementSystem,
  writeMeasurementSystem,
} from '../core/measurementSystem.js';
import {
  STORAGE_KEY as PRECISION_KEY,
  MIN_PRECISION,
  MAX_PRECISION,
  readDecimalPrecision,
  writeDecimalPrecision,
  normalizeDecimalPrecision,
} from '../core/decimalPrecision.js';
import {
  STORAGE_KEY as CLOCK_KEY,
  CLOCK_FORMATS,
  readClockFormat,
  writeClockFormat,
} from '../core/clockFormat.js';
import { t, getLocale, setLocale } from '../i18n/index.js';

const STORAGE_KEY = 'math-notes-theme';
// "Reset data" must clear exactly the keys the app's modules own, imported
// from their owners so a rename cannot silently leave one behind.
const RESET_KEYS = [
  STORAGE_KEY,
  TABS_KEY,
  LEGACY_TABS_KEY,
  CURRENCY_KEY,
  FONT_KEY,
  MEASUREMENT_KEY,
  PRECISION_KEY,
  CLOCK_KEY,
  TOTAL_MODE_KEY,
  LANGUAGE_KEY,
  // So "Reset data" genuinely returns the app to a first run.
  ONBOARDED_KEY,
  // A first run should also offer the starter-content actions again.
  DISMISSED_KEY,
];

const THEMES = [
  { id: 'one-dark', name: 'One Dark', swatch: ['#282c34', '#2f343d', '#abb2bf'] },
  { id: 'dracula', name: 'Dracula', swatch: ['#282a36', '#2f3141', '#f8f8f2'] },
  { id: 'solarized-dark', name: 'Solarized Dark', swatch: ['#002b36', '#073642', '#93a1a1'] },
  { id: 'monokai', name: 'Monokai', swatch: ['#272822', '#2d2d26', '#f8f8f2'] },
  { id: 'light', name: 'Light', swatch: ['#ffffff', '#eef0f4', '#383a42'] },
];

const MEASUREMENT_KEYS = {
  metric: 'measurement.metric',
  us: 'measurement.us',
  imperial: 'measurement.imperial',
};
const CLOCK_KEYS = { 24: 'clock.24', 12: 'clock.12' };
const LANGUAGE_KEYS = { en: 'language.en', pt: 'language.pt', es: 'language.es' };

function currentTheme() {
  return document.documentElement.dataset.theme || 'one-dark';
}

function syncThemeColor(id) {
  const theme = THEMES.find((entry) => entry.id === id);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (theme && meta) meta.setAttribute('content', theme.swatch[0]);
}

function applyTheme(id) {
  document.documentElement.dataset.theme = id;
  syncThemeColor(id);
  storage.set(STORAGE_KEY, id);
}

function initSettings(contentEditableNode, tabsApi) {
  const button = document.getElementById('settings-button');
  const modal = document.getElementById('settings-modal');
  const listNode = modal.querySelector('.settings-themes');

  initModal(modal, button, { onOpen: renderSnapshots, onClose: () => contentEditableNode.focus() });

  THEMES.forEach((theme) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'theme-card';
    card.dataset.theme = theme.id;
    card.title = `Apply ${theme.name}`;

    const swatch = document.createElement('span');
    swatch.className = 'theme-swatch';
    theme.swatch.forEach((color) => {
      const chip = document.createElement('span');
      chip.style.background = color;
      swatch.appendChild(chip);
    });

    const name = document.createElement('span');
    name.textContent = theme.name;

    card.appendChild(swatch);
    card.appendChild(name);
    card.addEventListener('click', () => {
      applyTheme(theme.id);
      renderActive();
      // The inline startup script restores only data-theme; keep the browser
      // chrome (theme-color meta) in step with the theme that was just applied.
      syncThemeColor(currentTheme());
    });
    listNode.appendChild(card);
  });

  function renderActive() {
    const current = currentTheme();
    listNode.querySelectorAll('.theme-card').forEach((card) => {
      card.classList.toggle('active', card.dataset.theme === current);
    });
  }
  renderActive();

  const measurementNode = modal.querySelector('.settings-measurement');
  MEASUREMENT_SYSTEMS.forEach((system) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'measurement-card';
    card.dataset.system = system;
    card.addEventListener('click', () => {
      writeMeasurementSystem(system);
      renderMeasurement();
      window.dispatchEvent(new CustomEvent('measurement:updated', { detail: system }));
    });
    measurementNode.appendChild(card);
  });

  function renderMeasurement() {
    const current = readMeasurementSystem();
    measurementNode.querySelectorAll('.measurement-card').forEach((card) => {
      card.classList.toggle('active', card.dataset.system === current);
    });
  }
  renderMeasurement();

  const precisionInput = document.getElementById('decimal-precision');
  precisionInput.min = String(MIN_PRECISION);
  precisionInput.max = String(MAX_PRECISION);
  precisionInput.value = String(readDecimalPrecision());
  precisionInput.addEventListener('change', () => {
    const value = normalizeDecimalPrecision(precisionInput.value);
    writeDecimalPrecision(value);
    precisionInput.value = String(value);
    window.dispatchEvent(new CustomEvent('precision:updated', { detail: value }));
  });

  const clockNode = modal.querySelector('.settings-clock');
  CLOCK_FORMATS.forEach((format) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'measurement-card';
    card.dataset.format = format;
    card.addEventListener('click', () => {
      writeClockFormat(format);
      renderClock();
      window.dispatchEvent(new CustomEvent('clock-format:updated', { detail: format }));
    });
    clockNode.appendChild(card);
  });

  function renderClock() {
    const current = readClockFormat();
    clockNode.querySelectorAll('.measurement-card').forEach((card) => {
      card.classList.toggle('active', card.dataset.format === current);
    });
  }
  renderClock();

  const languageNode = modal.querySelector('.settings-language');
  SUPPORTED_LANGUAGES.forEach((code) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'measurement-card';
    card.dataset.lang = code;
    card.addEventListener('click', () => {
      setLocale(code);
      renderLanguage();
    });
    languageNode.appendChild(card);
  });

  function renderLanguage() {
    const current = getLocale();
    languageNode.querySelectorAll('.measurement-card').forEach((card) => {
      card.classList.toggle('active', card.dataset.lang === current);
    });
  }
  renderLanguage();

  // Text (and titles) that depend on the active language. Re-run on change.
  function renderLabels() {
    THEMES.forEach((theme) => {
      const card = listNode.querySelector(`.theme-card[data-theme="${theme.id}"]`);
      if (card) card.title = t('apply.theme', { name: theme.name });
    });
    MEASUREMENT_SYSTEMS.forEach((system) => {
      const card = measurementNode.querySelector(`.measurement-card[data-system="${system}"]`);
      if (card) {
        card.textContent = t(MEASUREMENT_KEYS[system]);
        card.title = t('apply.measurement', { name: t(MEASUREMENT_KEYS[system]) });
      }
    });
    CLOCK_FORMATS.forEach((format) => {
      const card = clockNode.querySelector(`.measurement-card[data-format="${format}"]`);
      if (card) {
        card.textContent = t(CLOCK_KEYS[format]);
        card.title = t('apply.clock', { name: t(CLOCK_KEYS[format]) });
      }
    });
    SUPPORTED_LANGUAGES.forEach((code) => {
      const card = languageNode.querySelector(`.measurement-card[data-lang="${code}"]`);
      if (card) {
        card.textContent = t(LANGUAGE_KEYS[code]);
        card.title = t('apply.language', { name: t(LANGUAGE_KEYS[code]) });
      }
    });
  }
  renderLabels();

  window.addEventListener('language:updated', () => {
    renderLabels();
    renderSnapshots();
  });

  const resetButton = document.getElementById('reset-data-button');
  resetButton.addEventListener('click', async () => {
    if (!window.confirm(t('settings.resetConfirm'))) return;
    RESET_KEYS.forEach((key) => storage.remove(key));
    try {
      const { clearSnapshots } = await import('../storage/snapshots.js');
      await clearSnapshots();
    } catch {
      // storage unavailable
    }
    window.location.reload();
  });

  async function renderSnapshots() {
    const container = document.getElementById('snapshot-history');
    const restoreAllButton = document.getElementById('restore-all-button');
    let snapshots = [];
    try {
      const { latestPerTab } = await import('../storage/snapshots.js');
      snapshots = await latestPerTab();
    } catch {
      // storage unavailable
    }
    container.textContent = '';
    restoreAllButton.disabled = !snapshots.length;
    if (!snapshots.length) {
      container.textContent = t('settings.noSnapshots');
      return;
    }
    for (const snapshot of snapshots) {
      const row = document.createElement('div');
      row.className = 'snapshot-row';

      const label = document.createElement('span');
      label.textContent = `${snapshot.name} — ${timeAgo(snapshot.timestamp)}`;

      const restore = document.createElement('button');
      restore.type = 'button';
      restore.textContent = t('settings.restore');
      restore.addEventListener('click', () => {
        const confirm = window.confirm(
          t('settings.restoreConfirm', { name: snapshot.name, ago: timeAgo(snapshot.timestamp) })
        );
        if (confirm) tabsApi.restoreTab(snapshot);
      });

      row.appendChild(label);
      row.appendChild(restore);
      container.appendChild(row);
    }
    restoreAllButton.onclick = () => {
      if (!snapshots.length) return;
      if (window.confirm(t('settings.restoreAllConfirm'))) tabsApi.restoreAll(snapshots);
    };
  }
}

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return t('time.justNow');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('time.minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time.hoursAgo', { n: hours });
  return t('time.daysAgo', { n: Math.floor(hours / 24) });
}

export default initSettings;
