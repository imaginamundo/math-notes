import initModal from './modal.js';
import storage from '../util/storage.js';
import { ONBOARDED_KEY } from './onboarding.js';
import { DISMISSED_KEY } from './starterPrompt.js';
import { FONT_KEY } from './cosmetic.js';
import { STORAGE_KEY as TABS_KEY, LEGACY_KEY as LEGACY_TABS_KEY } from './tabs.js';
import { BACKUP_KEY as TABS_BACKUP_KEY } from '../storage/tabsStore.js';
import { STORAGE_KEY as CURRENCY_KEY } from '../storage/currencyRates.js';
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
import {
  MEASUREMENT_UPDATED,
  PRECISION_UPDATED,
  CLOCK_FORMAT_UPDATED,
  LANGUAGE_UPDATED,
} from '../util/events.js';

const STORAGE_KEY = 'math-notes-theme';
// "Reset data" must clear exactly the keys the app's modules own, imported
// from their owners so a rename cannot silently leave one behind.
const RESET_KEYS = [
  STORAGE_KEY,
  TABS_KEY,
  LEGACY_TABS_KEY,
  TABS_BACKUP_KEY,
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

// The theme grid (swatches instead of labels). Kept apart from the plain choice
// groups below because each card draws three colours.
function initThemePicker(node) {
  const cards = [];
  for (const theme of THEMES) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'theme-card';
    card.dataset.theme = theme.id;

    const swatch = document.createElement('span');
    swatch.className = 'theme-swatch';
    for (const color of theme.swatch) {
      const chip = document.createElement('span');
      chip.style.background = color;
      swatch.appendChild(chip);
    }

    const name = document.createElement('span');
    name.textContent = theme.name;

    card.append(swatch, name);
    card.addEventListener('click', () => {
      applyTheme(theme.id);
      render();
      // The inline startup script restores only data-theme; keep the browser
      // chrome (theme-color meta) in step with the theme that was just applied.
      syncThemeColor(currentTheme());
    });
    node.appendChild(card);
    cards.push(card);
  }

  function render() {
    const current = currentTheme();
    for (const card of cards) card.classList.toggle('active', card.dataset.theme === current);
  }

  function renderLabels() {
    for (const card of cards) {
      const theme = THEMES.find((entry) => entry.id === card.dataset.theme);
      card.title = t('apply.theme', { name: theme.name });
    }
  }

  render();
  renderLabels();
  return { render, renderLabels };
}

// A radio-style row of buttons (measurement system, clock format, language).
// `read` returns the active value, `select` persists it, and `labelKey` maps a
// value to its i18n key.
function createChoiceGroup(node, { options, dataKey, read, select, labelKey, applyKey }) {
  const cards = new Map();
  for (const value of options) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'measurement-card';
    card.dataset[dataKey] = value;
    card.addEventListener('click', () => {
      select(value);
      render();
    });
    node.appendChild(card);
    cards.set(value, card);
  }

  function render() {
    const current = read();
    for (const [value, card] of cards) card.classList.toggle('active', value === current);
  }

  function renderLabels() {
    for (const [value, card] of cards) {
      const text = t(labelKey(value));
      card.textContent = text;
      card.title = t(applyKey, { name: text });
    }
  }

  render();
  renderLabels();
  return { render, renderLabels };
}

// The snapshot history and its "Restore all" action. Rebuilt on open and on a
// language change.
function initSnapshotHistory(container, restoreAllButton, tabsApi) {
  async function render() {
    let snapshots = [];
    let latest = [];
    try {
      const mod = await import('../storage/snapshots.js');
      snapshots = await mod.listSnapshots();
      latest = await mod.latestPerTab();
    } catch {
      // storage unavailable
    }
    container.textContent = '';
    restoreAllButton.disabled = !latest.length;
    if (!snapshots.length) {
      container.textContent = t('settings.noSnapshots');
      return;
    }

    // Show every snapshot, grouped by tab, so the older ones are reachable.
    const groups = new Map();
    for (const snapshot of snapshots) {
      if (!groups.has(snapshot.tabId)) groups.set(snapshot.tabId, []);
      groups.get(snapshot.tabId).push(snapshot);
    }
    for (const entries of groups.values()) {
      const heading = document.createElement('div');
      heading.className = 'snapshot-heading';
      heading.textContent = entries[0].name;
      container.appendChild(heading);

      for (const snapshot of entries) {
        const row = document.createElement('div');
        row.className = 'snapshot-row';

        const label = document.createElement('span');
        label.textContent = timeAgo(snapshot.timestamp);

        const restore = document.createElement('button');
        restore.type = 'button';
        restore.textContent = t('settings.restore');
        restore.addEventListener('click', () => {
          const confirm = window.confirm(
            t('settings.restoreConfirm', { name: snapshot.name, ago: timeAgo(snapshot.timestamp) })
          );
          if (confirm) tabsApi.restoreTab(snapshot);
        });

        row.append(label, restore);
        container.appendChild(row);
      }
    }

    restoreAllButton.onclick = () => {
      if (!latest.length) return;
      if (window.confirm(t('settings.restoreAllConfirm'))) tabsApi.restoreAll(latest);
    };
  }

  return { render };
}

function initSettings(tabsApi) {
  const button = document.getElementById('settings-button');
  const modal = document.getElementById('settings-modal');

  const themePicker = initThemePicker(modal.querySelector('.settings-themes'));

  const measurement = createChoiceGroup(modal.querySelector('.settings-measurement'), {
    options: MEASUREMENT_SYSTEMS,
    dataKey: 'system',
    read: readMeasurementSystem,
    select: (system) => {
      writeMeasurementSystem(system);
      window.dispatchEvent(new CustomEvent(MEASUREMENT_UPDATED, { detail: system }));
    },
    labelKey: (system) => MEASUREMENT_KEYS[system],
    applyKey: 'apply.measurement',
  });

  const precisionInput = document.getElementById('decimal-precision');
  precisionInput.min = String(MIN_PRECISION);
  precisionInput.max = String(MAX_PRECISION);
  precisionInput.value = String(readDecimalPrecision());
  precisionInput.addEventListener('change', () => {
    const value = normalizeDecimalPrecision(precisionInput.value);
    writeDecimalPrecision(value);
    precisionInput.value = String(value);
    window.dispatchEvent(new CustomEvent(PRECISION_UPDATED, { detail: value }));
  });

  const clock = createChoiceGroup(modal.querySelector('.settings-clock'), {
    options: CLOCK_FORMATS,
    dataKey: 'format',
    read: readClockFormat,
    select: (format) => {
      writeClockFormat(format);
      window.dispatchEvent(new CustomEvent(CLOCK_FORMAT_UPDATED, { detail: format }));
    },
    labelKey: (format) => CLOCK_KEYS[format],
    applyKey: 'apply.clock',
  });

  const language = createChoiceGroup(modal.querySelector('.settings-language'), {
    options: SUPPORTED_LANGUAGES,
    dataKey: 'lang',
    read: getLocale,
    select: (code) => setLocale(code),
    labelKey: (code) => LANGUAGE_KEYS[code],
    applyKey: 'apply.language',
  });

  const snapshots = initSnapshotHistory(
    document.getElementById('snapshot-history'),
    document.getElementById('restore-all-button'),
    tabsApi
  );

  initModal(modal, button, {
    onOpen: snapshots.render,
  });

  // Text (and titles) that depend on the active language. Re-run on change.
  function renderLabels() {
    themePicker.renderLabels();
    measurement.renderLabels();
    clock.renderLabels();
    language.renderLabels();
  }

  window.addEventListener(LANGUAGE_UPDATED, () => {
    renderLabels();
    snapshots.render();
  });

  const resetButton = document.getElementById('reset-data-button');
  resetButton.addEventListener('click', async () => {
    if (!window.confirm(t('settings.resetConfirm'))) return;
    RESET_KEYS.forEach((key) => storage.remove(key));
    // Drop the in-memory tabs and their pending writes before clearing
    // snapshots, so the reload below is a genuine first run and the Welcome
    // sheet is seeded again.
    tabsApi.reset();
    try {
      const { clearSnapshots } = await import('../storage/snapshots.js');
      await clearSnapshots();
    } catch {
      // storage unavailable
    }
    window.location.reload();
  });
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
