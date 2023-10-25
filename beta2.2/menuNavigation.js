// ./menuNavigation.js

// Select all menus
const toggleButton = document.getElementById("toggle-menu");
const menus1 = document.querySelectorAll(".menu");
const mainMenu = document.querySelector("#main-menu");
let activeMenu = null; // Track the active submenu

// Hide all menus except the main menu
menus1.forEach((menu) => {
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
    }
  });
});

// Add keydown event listener for Escape key
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { // User pressed Escape key
    // Show the main menu with centered alignment
    showMenu("#main-menu");
  }
});
