import initModal from './modal.js';

const STORAGE_KEY = 'math-notes-theme';
const RESET_KEYS = [
  STORAGE_KEY,
  'math-notes-tabs',
  'math-notes-currency-rates',
  'input',
  'math-notes-font-size',
  'fontSize',
  // So "Reset data" genuinely returns the app to a first run, tour included.
  'math-notes-onboarded',
  // A first run should also offer the starter-content actions again.
  'math-notes-starter-dismissed',
];

const THEMES = [
  { id: 'one-dark', name: 'One Dark', swatch: ['#282c34', '#2f343d', '#abb2bf'] },
  { id: 'dracula', name: 'Dracula', swatch: ['#282a36', '#2f3141', '#f8f8f2'] },
  { id: 'solarized-dark', name: 'Solarized Dark', swatch: ['#002b36', '#073642', '#93a1a1'] },
  { id: 'monokai', name: 'Monokai', swatch: ['#272822', '#2d2d26', '#f8f8f2'] },
];

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
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // storage unavailable
  }
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

  const resetButton = document.getElementById('reset-data-button');
  resetButton.addEventListener('click', async () => {
    if (!window.confirm('This will reset the theme, tabs and all stored data. Continue?')) return;
    RESET_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // storage unavailable
      }
    });
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
      container.textContent = 'No snapshots yet. They appear a few seconds after you edit a tab.';
      return;
    }
    for (const snapshot of snapshots) {
      const row = document.createElement('div');
      row.className = 'snapshot-row';

      const label = document.createElement('span');
      label.textContent = `${snapshot.name} — ${timeAgo(snapshot.timestamp)}`;

      const restore = document.createElement('button');
      restore.type = 'button';
      restore.textContent = 'Restore';
      restore.addEventListener('click', () => {
        const confirm = window.confirm(
          `Restore "${snapshot.name}" from ${timeAgo(snapshot.timestamp)}? This replaces its current content.`
        );
        if (confirm) tabsApi.restoreTab(snapshot);
      });

      row.appendChild(label);
      row.appendChild(restore);
      container.appendChild(row);
    }
    restoreAllButton.onclick = () => {
      if (!snapshots.length) return;
      const confirm = window.confirm(
        'Replace all tabs with the latest snapshot of each? This discards the current tabs.'
      );
      if (confirm) tabsApi.restoreAll(snapshots);
    };
  }
}

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default initSettings;
