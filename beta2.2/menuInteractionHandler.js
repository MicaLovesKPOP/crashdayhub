// ./menuInteractionHandler.js

const MENU_SELECTOR = '.menu';
const MENU_ITEM_SELECTOR = 'li';
const MENU_LINK_SELECTOR = 'a';
const MAIN_MENU_ID = '#main-menu';

const HELP_MARQUEE_VIEWPORT_TRAVEL_MS = 17000;
const HELP_MARQUEE_BLANK_WAIT_MS = 3000;
const HELP_MARQUEE_GLYPH_CLEARANCE_EM = 1.4;

const menus = Array.from(document.querySelectorAll(MENU_SELECTOR));
const body = document.body;

let activeMenuId = MAIN_MENU_ID;
let selectedIndex = 0;
let activeHelpText = '';
let helpMarqueeAnimation;
let helpMarqueeTimeout;
let helpMarqueeToken = 0;

function getMenu(menuId = activeMenuId) {
  return document.querySelector(menuId);
}

function getMenuItems(menuId = activeMenuId) {
  const menu = getMenu(menuId);
  if (!menu) return [];

  return Array.from(menu.querySelectorAll(MENU_ITEM_SELECTOR)).filter((item) => {
    return !item.classList.contains('disabled') && item.getAttribute('aria-disabled') !== 'true';
  });
}

function getSelectedItem() {
  return getMenuItems()[selectedIndex] ?? null;
}

function getLinkFromItem(item) {
  return item ? item.querySelector(MENU_LINK_SELECTOR) : null;
}

function isSettingLink(link) {
  return Boolean(link?.classList.contains('setting-link'));
}

function isSubmenuLink(link) {
  const href = link?.getAttribute('href');

  if (!href || !href.startsWith('#') || href.length <= 1) {
    return false;
  }

  try {
    return Boolean(document.querySelector(href));
  } catch {
    return false;
  }
}

function stopContextHelpMarquee() {
  helpMarqueeToken += 1;

  if (helpMarqueeAnimation) {
    helpMarqueeAnimation.cancel();
    helpMarqueeAnimation = undefined;
  }

  if (helpMarqueeTimeout) {
    window.clearTimeout(helpMarqueeTimeout);
    helpMarqueeTimeout = undefined;
  }
}

function startContextHelpMarquee(helpText) {
  stopContextHelpMarquee();

  const token = helpMarqueeToken;

  function runLoop() {
    if (token !== helpMarqueeToken) return;

    const viewportWidth = window.innerWidth;
    const textWidth = helpText.getBoundingClientRect().width;
    const fontSize = Number.parseFloat(window.getComputedStyle(helpText).fontSize) || 0;
    const glyphClearance = fontSize * HELP_MARQUEE_GLYPH_CLEARANCE_EM;
    const distance = viewportWidth + textWidth + glyphClearance;
    const pixelsPerMs = viewportWidth / HELP_MARQUEE_VIEWPORT_TRAVEL_MS;
    const movementDuration = distance / pixelsPerMs;

    helpText.style.transform = 'translate(0, -50%)';

    helpMarqueeAnimation = helpText.animate(
      [
        { transform: 'translate(0, -50%)' },
        { transform: `translate(-${distance}px, -50%)` }
      ],
      {
        duration: movementDuration,
        easing: 'linear',
        fill: 'forwards'
      }
    );

    helpMarqueeAnimation.finished
      .then(() => {
        if (token !== helpMarqueeToken) return;

        helpMarqueeTimeout = window.setTimeout(() => {
          if (token !== helpMarqueeToken) return;
          runLoop();
        }, HELP_MARQUEE_BLANK_WAIT_MS);
      })
      .catch(() => {});
  }

  window.requestAnimationFrame(runLoop);
}

function updateContextHelp(link) {
  const helpBar = document.querySelector('.context-help-bar');
  const helpText = document.querySelector('#context-help-text');
  const text = link?.dataset.help?.trim() || '';

  if (!helpBar || !helpText) return;

  if (!text) {
    activeHelpText = '';
    stopContextHelpMarquee();
    helpText.textContent = '';
    helpText.style.transform = 'translate(0, -50%)';
    helpBar.classList.remove('visible');
    helpBar.setAttribute('aria-hidden', 'true');
    return;
  }

  if (text !== activeHelpText) {
    activeHelpText = text;
    helpText.textContent = text;
    helpBar.classList.add('visible');
    helpBar.setAttribute('aria-hidden', 'false');
    startContextHelpMarquee(helpText);
    return;
  }

  helpBar.classList.add('visible');
  helpBar.setAttribute('aria-hidden', 'false');
}

function setMenuVisibility(menu, isActive) {
  menu.style.display = isActive ? 'flex' : 'none';
  menu.setAttribute('aria-hidden', isActive ? 'false' : 'true');

  menu.querySelectorAll(MENU_LINK_SELECTOR).forEach((link) => {
    const item = link.closest(MENU_ITEM_SELECTOR);
    const isDisabled = item?.classList.contains('disabled') || item?.getAttribute('aria-disabled') === 'true';
    link.tabIndex = isActive && !isDisabled ? 0 : -1;
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

  menus.forEach((menu) => {
    menu.querySelectorAll(MENU_ITEM_SELECTOR).forEach((item) => item.classList.remove('selected'));
  });

  const items = getMenuItems();
  if (items.length === 0) {
    updateContextHelp(null);
    return;
  }

  selectedIndex = Math.max(0, Math.min(selectedIndex, items.length - 1));
  const selectedItem = items[selectedIndex];
  selectedItem.classList.add('selected');

  const selectedLink = getLinkFromItem(selectedItem);
  selectedLink?.focus({ preventScroll: true });
  updateContextHelp(selectedLink);
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

function adjustSetting(link, direction = 1) {
  if (!isSettingLink(link)) return false;

  if (typeof window.crashdayHubAdjustSetting === 'function') {
    window.crashdayHubAdjustSetting(link, direction);
  } else {
    link.click();
  }

  syncSelectionToDom();
  return true;
}

function activateLink(link) {
  if (!link) return;

  if (adjustSetting(link, 1)) {
    return;
  }

  if (isSubmenuLink(link)) {
    showMenu(link.getAttribute('href'), 0);
    return;
  }

  const href = link.getAttribute('href');

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
      if (item.classList.contains('disabled') || item.getAttribute('aria-disabled') === 'true') return;

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
      if (item.classList.contains('disabled') || item.getAttribute('aria-disabled') === 'true') return;

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
    if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape'].includes(event.key)) return;

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
      return;
    }

    if (event.key === 'ArrowUp') {
      moveSelection(-1);
      return;
    }

    const selectedLink = getLinkFromItem(getSelectedItem());

    if (event.key === 'ArrowLeft') {
      adjustSetting(selectedLink, -1);
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'Enter') {
      activateLink(selectedLink);
    }
  });
}

window.addEventListener('resize', () => {
  if (activeHelpText) {
    const helpText = document.querySelector('#context-help-text');
    if (helpText) {
      startContextHelpMarquee(helpText);
    }
  }
});

window.crashdayHubMenuSync = syncSelectionToDom;

bindMenuPointerControls();
bindKeyboardControls();
showMenu(MAIN_MENU_ID, 0);
