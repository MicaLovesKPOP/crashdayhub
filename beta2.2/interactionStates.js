// ./interactionStates.js

let menus = document.querySelectorAll('.menu');
let menuItems = Array.from(document.querySelector('#main-menu .menu-list').querySelectorAll('li'));
let lastActiveIndex = 0;
let body = document.querySelector('body');

// Add keydown event listener for Escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { // User pressed Escape key
      // Hide all menus
      menus.forEach((menu) => {
        menu.style.display = "none";
      });
  
      // Show the main menu
      const mainMenu = document.querySelector("#main-menu");
      mainMenu.style.display = "block";
  
      // Reset menuItems array and lastActiveIndex variable
      menuItems = Array.from(mainMenu.querySelectorAll('li'));
      //setActive(0);  // Select the first item in the main menu
      //setActive(0, false);  // Don't select the first item automatically
    }
  });
  
function setActive(index, select = true) {
    if (index >= 0 && index < menuItems.length) {
      menuItems[lastActiveIndex].classList.remove('selected');
      if (select) {
        menuItems[index].classList.add('selected');
      }
      lastActiveIndex = index;
    }
  }
  
  // Handle keyboard navigation
  document.addEventListener('keydown', function(event) {
    body.classList.add('keyboard-navigation');
    if (event.key === 'Tab' || event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((lastActiveIndex + 1) % menuItems.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((lastActiveIndex - 1 + menuItems.length) % menuItems.length);
    } else if (event.key === 'Escape') {
      menus.forEach(menu => menu.classList.remove('active'));
      menuItems[lastActiveIndex].classList.remove('selected');
    }
  });
  
  // Handle mouse hover
  function addMouseoverListeners() {
    menuItems.forEach((item, index) => {
      item.addEventListener('mouseover', function() {
        body.classList.remove('keyboard-navigation');
        setActive(index);
      });
    });
  }
  
  addMouseoverListeners();  // Call this once for the main menu
  
// Handle submenu navigation
menus.forEach(menu => {
    let trigger = document.querySelector(`a[href="#${menu.id}"]`);
    if (trigger) {
      trigger.addEventListener('click', function(event) {
        event.preventDefault();
        // Remove 'selected' class from all menu items
        menuItems.forEach(item => item.classList.remove('selected'));
        menus.forEach(m => m.classList.remove('active'));
        menu.classList.add('active');
        menuItems = Array.from(menu.querySelectorAll('li'));
        lastActiveIndex = 0;
        //setActive(0);  // Select the first item in the main menu
        //setActive(0, false);  // Don't select the first item automatically
        addMouseoverListeners();  // Call this again whenever a submenu is opened
      });
    }
  });
  
  