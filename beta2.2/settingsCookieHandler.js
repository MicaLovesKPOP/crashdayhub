// ./settingsCookieHandler.js

// Define iframe and imageBackground at a scope that is accessible by all setting handler functions
const iframe = document.querySelector('iframe');
const imageBackground = document.querySelector('.image-background');

// Object to store the default and current settings
const settings = {
  "Cookies": 0, // Off, On
  "Welcome Screen": 1, // Off, On
  "Background Video": 1, // Off, Loop, Once
  "Effects Volume": 5, // 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
  "Music Volume": 5 // 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
};

// Object to map numeric values to display values for specific settings
const displayValues = {
  "Cookies": ["Off", "On"],
  "Welcome Screen": ["Off", "On"],
  "Background Video": ["Off", "Loop", "Once"]
};

// Function to get a future date for cookie expiration (1 year from now)
const getOneYearFromNow = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toUTCString();
}

// Function to update the 'expires' attribute of a cookie
const updateCookie = (setting, newState) => {
  if (setting === "Cookies") {
    if (newState === 0) {
      // If Cookies are off, delete all cookies
      console.log("Cookies are off, deleting all cookies")
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    } else {
      // If Cookies are on, set all cookies with the current settings
      console.log("Cookies are on, setting all cookies with the current settings")
      const expirationDate = getOneYearFromNow();
      Object.keys(settings).forEach((setting) => {
        console.log(`${setting}=${settings[setting]}; expires=${expirationDate}; path=/`);
        document.cookie = `${setting}=${settings[setting]}; expires=${expirationDate}; path=/`;
      });
    }
  } else if (settings["Cookies"] === 1) {
    // For other settings, only set the cookie if Cookies are on
      console.log("Other settings, only setting the cookie if Cookies are on")
    const expirationDate = getOneYearFromNow();
    document.cookie = `${setting}=${newState}; expires=${expirationDate}; path=/`;
  }
}

// Function to get a cookie by name
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

// Load settings from cookies and update UI
document.addEventListener("DOMContentLoaded", () => {
  // Select all elements with the class "setting-link"
  const settingsLinks = document.querySelectorAll(".setting-link");

  Object.keys(settings).forEach((setting) => {
    const cookieValue = getCookie(setting);
    if (cookieValue !== undefined) {
      settings[setting] = parseInt(cookieValue);
    }
    // Update UI to reflect loaded settings
    const link = Array.from(settingsLinks).find(link => link.dataset.setting === setting);
    if (link) {
      const displayValue = displayValues[setting] ? displayValues[setting][settings[setting]] : settings[setting];
      link.textContent = `${setting}: ${displayValue}`;
    }
    // Set a cookie with a one-year expiration for new settings
    updateCookie(setting, settings[setting]);
  });

  // Add click event listeners to all setting links
  settingsLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault(); // Prevent navigation
  
      // Get the current state from the settings object
      const currentState = settings[e.currentTarget.dataset.setting];
  
      // Determine the new state
      let newState;
      if (displayValues[e.currentTarget.dataset.setting]) {
        newState = (currentState + 1) % displayValues[e.currentTarget.dataset.setting].length;
      } else if (e.currentTarget.dataset.setting === "Effects Volume" || e.currentTarget.dataset.setting === "Music Volume") {
        newState = currentState < 10 ? currentState + 1 : 0;
      } else {
        newState = currentState === 0 ? 1 : 0;
      }
  
      // Update the link text with the new state
      const displayValue = displayValues[e.currentTarget.dataset.setting] ? displayValues[e.currentTarget.dataset.setting][newState] : newState;
      e.currentTarget.textContent = `${e.currentTarget.dataset.setting}: ${displayValue}`;
  
      // Store the new state in settings object
      settings[e.currentTarget.dataset.setting] = newState;
  
      // Call updateCookie to set the cookie with the new state and one-year expiration
      updateCookie(e.currentTarget.dataset.setting, newState);
    });
  });  
});
