import initModal from './modal.js';

const STORAGE_KEY = 'math-notes-theme';
const RESET_KEYS = [
  STORAGE_KEY,
  'math-notes-tabs',
  'math-notes-currency-rates',
  'input',
  'math-notes-font-size',
  'fontSize',
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

function applyTheme(id) {
  document.documentElement.dataset.theme = id;
  const theme = THEMES.find((entry) => entry.id === id);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (theme && meta) meta.setAttribute('content', theme.swatch[0]);
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // storage unavailable
  }
}

function initSettings(contentEditableNode) {
  const button = document.getElementById('settings-button');
  const modal = document.getElementById('settings-modal');
  const listNode = modal.querySelector('.settings-themes');

  initModal(modal, button, { onClose: () => contentEditableNode.focus() });

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
  resetButton.addEventListener('click', () => {
    if (!window.confirm('This will reset the theme, tabs and all stored data. Continue?')) return;
    RESET_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // storage unavailable
      }
    });
    window.location.reload();
  });
}

export default initSettings;
