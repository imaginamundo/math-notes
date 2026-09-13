// The tab bar's DOM: rendering every tab, the new-tab button, inline rename and
// pointer drag-reorder. It owns only the DOM — which tab is active, the new
// name and the new order all go back through `handlers`, so the controller
// stays the single source of truth for `state`.
//
// handlers: { getState, focusEditor, activate(id), close(id), create(),
//             rename(id, name), reorder(ids), dragged() }
function createTabsView(tabBarNode, handlers) {
  let drag = null;
  let lastDragTime = 0;

  function render() {
    const state = handlers.getState();
    tabBarNode.innerHTML = '';
    tabBarNode.setAttribute('role', 'tablist');
    tabBarNode.setAttribute('aria-label', 'Worksheets');
    state.tabs.forEach((tab) => tabBarNode.appendChild(renderTab(tab, state.activeId)));
    tabBarNode.appendChild(renderNewButton());
    const panel = document.getElementById('editor-panel');
    if (panel) panel.setAttribute('aria-labelledby', state.activeId);
  }

  function renderTab(tab, activeId) {
    const active = tab.id === activeId;
    const tabNode = document.createElement('div');
    tabNode.className = 'tab' + (active ? ' active' : '');
    tabNode.id = tab.id;
    tabNode.dataset.id = tab.id;
    tabNode.setAttribute('role', 'tab');
    tabNode.setAttribute('aria-selected', String(active));
    tabNode.setAttribute('aria-controls', 'editor-panel');
    tabNode.tabIndex = active ? 0 : -1;

    const nameNode = document.createElement('span');
    nameNode.className = 'tab-name';
    nameNode.textContent = tab.name;
    nameNode.title = 'Double-click to rename';

    const closeNode = document.createElement('button');
    closeNode.className = 'tab-close';
    closeNode.textContent = '×';
    closeNode.title = 'Close tab';
    closeNode.setAttribute('aria-label', 'Close tab');

    tabNode.appendChild(nameNode);
    tabNode.appendChild(closeNode);
    return tabNode;
  }

  function renderNewButton() {
    const button = document.createElement('button');
    button.className = 'tab-new';
    button.textContent = '+';
    button.title = 'New tab';
    button.setAttribute('aria-label', 'New tab');
    return button;
  }

  function beginRename(id, nameNode) {
    const tab = handlers.getState().tabs.find((entry) => entry.id === id);
    if (!tab) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tab-rename';
    input.maxLength = 30;
    input.value = tab.name;
    nameNode.replaceWith(input);
    input.focus();
    input.select();

    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      const value = input.value.trim();
      if (save && value) handlers.rename(id, value);
      render();
    };
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        finish(true);
        handlers.focusEditor();
      } else if (event.key === 'Escape') {
        finish(false);
      }
    });
    input.addEventListener('blur', () => finish(true));
  }

  tabBarNode.addEventListener('click', (event) => {
    if (Date.now() - lastDragTime < 100) return;
    const closeButton = event.target.closest('.tab-close');
    if (closeButton) {
      handlers.close(closeButton.closest('.tab').dataset.id);
      return;
    }
    const tabElement = event.target.closest('.tab');
    if (tabElement) {
      handlers.activate(tabElement.dataset.id);
      return;
    }
    if (event.target.closest('.tab-new')) handlers.create();
  });

  tabBarNode.addEventListener('dblclick', (event) => {
    const nameElement = event.target.closest('.tab-name');
    if (!nameElement) return;
    beginRename(nameElement.closest('.tab').dataset.id, nameElement);
  });

  tabBarNode.addEventListener('keydown', (event) => {
    // Don't hijack keys while the rename input is focused (typing spaces, etc.)
    if (event.target.tagName === 'INPUT') return;
    const tabElement = event.target.closest('.tab');
    if (!tabElement) return;
    const ids = handlers.getState().tabs.map((tab) => tab.id);
    const index = ids.indexOf(tabElement.dataset.id);
    let nextIndex = -1;

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % ids.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + ids.length) % ids.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = ids.length - 1;

    if (nextIndex !== -1) {
      event.preventDefault();
      handlers.activate(ids[nextIndex]);
      const next = tabBarNode.querySelector(`.tab[data-id="${ids[nextIndex]}"]`);
      if (next) next.focus();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlers.activate(tabElement.dataset.id);
    }
  });

  // Drag to reorder tabs: pointer down on a tab starts a candidate, a move past
  // the threshold turns it into a drag that live-reorders the bar.
  tabBarNode.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const tabElement = event.target.closest('.tab');
    if (!tabElement || event.target.closest('.tab-close')) return;
    drag = {
      id: tabElement.dataset.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
  });

  document.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.active) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
      drag.active = true;
      const el = tabBarNode.querySelector(`.tab[data-id="${drag.id}"]`);
      if (el) el.classList.add('dragging');
    }
    event.preventDefault();
    const others = [...tabBarNode.querySelectorAll('.tab')].filter(
      (tab) => tab.dataset.id !== drag.id
    );
    let target = others.length;
    for (let i = 0; i < others.length; i++) {
      const rect = others[i].getBoundingClientRect();
      if (event.clientX < rect.left + rect.width / 2) {
        target = i;
        break;
      }
    }
    const draggedEl = tabBarNode.querySelector(`.tab[data-id="${drag.id}"]`);
    if (!draggedEl) return;
    const anchor = others[target] || tabBarNode.querySelector('.tab-new');
    if (draggedEl.nextSibling === anchor) return;
    tabBarNode.insertBefore(draggedEl, anchor);
    handlers.reorder([...tabBarNode.querySelectorAll('.tab')].map((tab) => tab.dataset.id));
  });

  const endDrag = () => {
    if (!drag) return;
    if (drag.active) {
      const el = tabBarNode.querySelector(`.tab[data-id="${drag.id}"]`);
      if (el) el.classList.remove('dragging');
      handlers.dragged();
      lastDragTime = Date.now();
    }
    drag = null;
  };
  document.addEventListener('pointerup', (event) => {
    if (drag && event.pointerId === drag.pointerId) endDrag();
  });
  document.addEventListener('pointercancel', endDrag);

  return { render };
}

export default createTabsView;
