// ./menuInteractionHandler.js

const MENU_SELECTOR = '.menu';
const MENU_ITEM_SELECTOR = 'li';
const MENU_LINK_SELECTOR = 'a';
const MAIN_MENU_ID = '#main-menu';

const menus = Array.from(document.querySelectorAll(MENU_SELECTOR));
const body = document.body;

let activeMenuId = MAIN_MENU_ID;
let selectedIndex = 0;

function getMenu(menuId = activeMenuId) {
  return document.querySelector(menuId);
}

function getMenuItems(menuId = activeMenuId) {
  const menu = getMenu(menuId);
  return menu ? Array.from(menu.querySelectorAll(MENU_ITEM_SELECTOR)) : [];
}

function getSelectedItem() {
  return getMenuItems()[selectedIndex] ?? null;
}

function getLinkFromItem(item) {
  return item ? item.querySelector(MENU_LINK_SELECTOR) : null;
}

function isSubmenuLink(link) {
  const href = link?.getAttribute('href');
  return Boolean(href && href.startsWith('#') && document.querySelector(href));
}

function setMenuVisibility(menu, isActive) {
  menu.style.display = isActive ? 'flex' : 'none';
  menu.setAttribute('aria-hidden', isActive ? 'false' : 'true');

  menu.querySelectorAll(MENU_LINK_SELECTOR).forEach((link) => {
    link.tabIndex = isActive ? 0 : -1;
  });

  if (!isActive) {
    menu.querySelectorAll(MENU_ITEM_SELECTOR).forEach((item) => item.classList.remove('selected'));
    return;
  }

  menu.style.justifyContent = 'center';
  menu.style.flexDirection = 'column';
  menu.style.position = 'absolute';
  menu.style.right = '0';
  menu.style.left = '0';
  menu.style.top = '0';
  menu.style.bottom = '0';
}

function syncSelectionToDom() {
  menus.forEach((menu) => {
    const isActive = `#${menu.id}` === activeMenuId;
    setMenuVisibility(menu, isActive);
  });

  const items = getMenuItems();
  if (items.length === 0) return;

  selectedIndex = Math.max(0, Math.min(selectedIndex, items.length - 1));

  items.forEach((item, index) => {
    item.classList.toggle('selected', index === selectedIndex);
  });

  const selectedLink = getLinkFromItem(items[selectedIndex]);
  selectedLink?.focus({ preventScroll: true });
}

function showMenu(menuId, newSelectedIndex = 0) {
  if (!getMenu(menuId)) return;

  activeMenuId = menuId;
  selectedIndex = newSelectedIndex;
  syncSelectionToDom();
}

function setSelectedIndex(index) {
  const items = getMenuItems();
  if (items.length === 0) return;

  selectedIndex = (index + items.length) % items.length;
  syncSelectionToDom();
}

function moveSelection(direction) {
  setSelectedIndex(selectedIndex + direction);
}

function activateLink(link) {
  if (!link) return;

  const href = link.getAttribute('href');

  if (isSubmenuLink(link)) {
    showMenu(href, 0);
    return;
  }

  if (link.classList.contains('setting-link')) {
    link.click();
    return;
  }

  if (href && href !== '#') {
    window.open(href, link.target || '_self', link.rel || undefined);
  }
}

function activateSelectedItem() {
  activateLink(getLinkFromItem(getSelectedItem()));
}

function bindMenuPointerControls() {
  menus.forEach((menu) => {
    menu.addEventListener('pointermove', (event) => {
      if (`#${menu.id}` !== activeMenuId) return;

      const item = event.target.closest(MENU_ITEM_SELECTOR);
      if (!item || !menu.contains(item)) return;

      const items = getMenuItems();
      const index = items.indexOf(item);
      if (index === -1 || index === selectedIndex) return;

      body.classList.remove('keyboard-navigation');
      setSelectedIndex(index);
    });

    menu.addEventListener('click', (event) => {
      if (`#${menu.id}` !== activeMenuId) return;

      const item = event.target.closest(MENU_ITEM_SELECTOR);
      if (!item || !menu.contains(item)) return;

      const items = getMenuItems();
      const index = items.indexOf(item);
      if (index === -1) return;

      event.preventDefault();
      setSelectedIndex(index);
      activateSelectedItem();
    });
  });
}

function bindKeyboardControls() {
  document.addEventListener('keydown', (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Tab', 'Enter', 'Escape'].includes(event.key)) return;

    if (event.key === 'Escape') {
      if (activeMenuId !== MAIN_MENU_ID) {
        event.preventDefault();
        showMenu(MAIN_MENU_ID, 0);
      }
      return;
    }

    event.preventDefault();
    body.classList.add('keyboard-navigation');

    if (event.key === 'ArrowDown' || event.key === 'Tab') {
      moveSelection(1);
    } else if (event.key === 'ArrowUp') {
      moveSelection(-1);
    } else if (event.key === 'Enter') {
      activateSelectedItem();
    }
  });
}

bindMenuPointerControls();
bindKeyboardControls();
showMenu(MAIN_MENU_ID, 0);
