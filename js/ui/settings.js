import initModal from './modal.js';

const STORAGE_KEY = 'math-notes-theme';

const THEMES = [
  { id: 'math-notes', name: 'Math Notes', swatch: ['#09183e', '#1c1c28', '#3a5cc8'] },
  { id: 'one-dark', name: 'One Dark', swatch: ['#282c34', '#2f343d', '#61afef'] },
  { id: 'dracula', name: 'Dracula', swatch: ['#282a36', '#2f3141', '#bd93f9'] },
  { id: 'solarized-dark', name: 'Solarized Dark', swatch: ['#002b36', '#073642', '#268bd2'] },
  { id: 'monokai', name: 'Monokai', swatch: ['#272822', '#2d2d26', '#66d9ef'] },
];

function currentTheme() {
  return document.documentElement.dataset.theme || 'math-notes';
}

function applyTheme(id) {
  if (id === 'math-notes') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch (error) {
    // storage unavailable
  }
}

function initSettings(contentEditableNode) {
  const button = document.getElementById('settings-button');
  const modal = document.getElementById('settings-modal');
  const listNode = modal.querySelector('.settings-themes');

  const { close } = initModal(modal, button, { onClose: () => contentEditableNode.focus() });

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
}

export default initSettings;
