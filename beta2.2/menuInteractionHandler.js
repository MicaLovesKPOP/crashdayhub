// ./menuInteractionHandler.js

// Select all menus
const toggleButton = document.getElementById("toggle-menu");
const menus = document.querySelectorAll(".menu");
const mainMenu = document.querySelector("#main-menu");
let menuItems = Array.from(document.querySelector('#main-menu .menu-list').querySelectorAll('li'));
let lastActiveIndex = 0;
let body = document.querySelector('body');
let activeMenu = "#main-menu"; // Track the active submenu

// Hide all menus except the main menu
menus.forEach((menu) => {
  if (!menu.classList.contains("main-menu")) {
    menu.style.display = "none";
  }
});

// Function to show a menu and apply centered alignment
function showMenu(menuId) {
  menus.forEach((menu) => {
    menu.style.display = "none";
    menu.style.removeProperty('justify-content'); // Remove centered alignment
    menu.style.removeProperty('flex-direction');
    menu.style.removeProperty('position');
    menu.style.removeProperty('right');
    menu.style.removeProperty('left');
    menu.style.removeProperty('top');
    menu.style.removeProperty('bottom');
  });

  const menu = document.querySelector(menuId);
  if (menu) {
    menu.style.display = "flex"; // Show the menu
    menu.style.justifyContent = "center";
    menu.style.flexDirection = "column";
    menu.style.position = "absolute";
    menu.style.right = "0";
    menu.style.left = "0";
    menu.style.top = "0";
    menu.style.bottom = "0";
    menu.querySelector('a').focus();

    activeMenu = menuId;
  }
}

// Add click event listeners to all links in the main menu
document.querySelectorAll("#main-menu a").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault(); // Prevent navigation

    // Show the clicked submenu
    const submenuId = e.currentTarget.getAttribute("href");
    const submenu = document.querySelector(submenuId);
    if (submenu) {
      submenu.style.display = "block";
      showMenu(submenuId);
      submenu.querySelector('a').focus();
      // Update the activeMenu and menuItem when a new submenu is opened
      activeMenu = submenuId;
      menuItems = Array.from(submenu.querySelectorAll('li'));
      lastActiveIndex = 0;
      addMouseoverListeners();  // Call this again whenever a submenu is opened
    }
  });
});

// Add keydown event listener for Escape key
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { // User pressed Escape key
    if (activeMenu !== "#main-menu") { // If main menu is not active
      // Show the main menu with centered alignment
      showMenu("#main-menu");
      activeMenu = "#main-menu"; // Update activeMenu to track that main menu is now active
      // Reset menuItem when returning to mainMenu
      menuItems = Array.from(mainMenu.querySelectorAll('li'));
      lastActiveIndex = 0;
      addMouseoverListeners();  // Call this again whenever a submenu is opened
    } else { // If mainMenu is active, hide all menus and remove selected class from menuItem
      menus.forEach(menu => {
        menu.classList.remove('active');
        if (menuItems.length > lastActiveIndex) {
          menuItems[lastActiveIndex].classList.remove('selected');
        }
      });
    }
  }
});

// Handle keyboard navigation and mouse hover events
document.addEventListener('keydown', function(event) {
  body.classList.add('keyboard-navigation');
  if (event.key === 'Tab' || event.key === 'ArrowDown') {
    event.preventDefault();
    setActive((lastActiveIndex + 1) % menuItems.length);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    setActive((lastActiveIndex - 1 + menuItems.length) % menuItems.length);
  }
});

function setActive(index, select = true) {
  if (index >= 0 && index < menuItems.length) {
    if (menuItems.length > lastActiveIndex) {
      menuItems[lastActiveIndex].classList.remove('selected');
    }
    
    if (select) {
      menuItems[index].classList.add('selected');
    }
    
    lastActiveIndex = index;
  }
}

function addMouseoverListeners() {
  menuItems.forEach((item, index) => {
    item.addEventListener('mouseover', function() {
      body.classList.remove('keyboard-navigation');
      setActive(index);
    });
  });
}

addMouseoverListeners();  // Call this once for the main menu

