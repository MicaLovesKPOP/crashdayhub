// ./menuInteractionHandler.js

const menus = document.querySelectorAll('.menu');
const mainMenu = document.querySelector('#main-menu');
const body = document.querySelector('body');

let menuItems = Array.from(mainMenu.querySelectorAll('li'));
let lastActiveIndex = 0;
let activeMenu = '#main-menu';

// Hide all menus except the main menu.
menus.forEach((menu) => {
  if (!menu.classList.contains('main-menu')) {
    menu.style.display = 'none';
  }
});

function showMenu(menuId) {
  menus.forEach((menu) => {
    menu.style.display = 'none';
    menu.style.removeProperty('justify-content');
    menu.style.removeProperty('flex-direction');
    menu.style.removeProperty('position');
    menu.style.removeProperty('right');
    menu.style.removeProperty('left');
    menu.style.removeProperty('top');
    menu.style.removeProperty('bottom');
  });

  const menu = document.querySelector(menuId);
  if (!menu) return;

  menu.style.display = 'flex';
  menu.style.justifyContent = 'center';
  menu.style.flexDirection = 'column';
  menu.style.position = 'absolute';
  menu.style.right = '0';
  menu.style.left = '0';
  menu.style.top = '0';
  menu.style.bottom = '0';

  const firstLink = menu.querySelector('a');
  if (firstLink) firstLink.focus();

  activeMenu = menuId;
  menuItems = Array.from(menu.querySelectorAll('li'));
  lastActiveIndex = 0;
  addMouseoverListeners();
}

// Only intercept in-page submenu links. Let external links navigate normally.
document.querySelectorAll('#main-menu a').forEach((link) => {
  link.addEventListener('click', (event) => {
    const href = event.currentTarget.getAttribute('href');

    if (!href || !href.startsWith('#')) {
      return;
    }

    const submenu = document.querySelector(href);
    if (!submenu) {
      return;
    }

    event.preventDefault();
    showMenu(href);
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;

  if (activeMenu !== '#main-menu') {
    showMenu('#main-menu');
    return;
  }

  if (menuItems.length > lastActiveIndex) {
    menuItems[lastActiveIndex].classList.remove('selected');
  }
});

document.addEventListener('keydown', (event) => {
  if (!['Tab', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
  if (menuItems.length === 0) return;

  body.classList.add('keyboard-navigation');
  event.preventDefault();

  if (event.key === 'Tab' || event.key === 'ArrowDown') {
    setActive((lastActiveIndex + 1) % menuItems.length);
  } else if (event.key === 'ArrowUp') {
    setActive((lastActiveIndex - 1 + menuItems.length) % menuItems.length);
  }
});

function setActive(index, select = true) {
  if (index < 0 || index >= menuItems.length) return;

  if (menuItems.length > lastActiveIndex) {
    menuItems[lastActiveIndex].classList.remove('selected');
  }

  if (select) {
    menuItems[index].classList.add('selected');
  }

  lastActiveIndex = index;
}

function addMouseoverListeners() {
  menuItems.forEach((item, index) => {
    item.onmouseover = () => {
      body.classList.remove('keyboard-navigation');
      setActive(index);
    };
  });
}

addMouseoverListeners();
