// ./settingsManager.js

// Function to get a future date for cookie expiration (1 year from now)
function getOneYearFromNow() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toUTCString();
}

// Wait for the DOM to fully load before running the script
document.addEventListener("DOMContentLoaded", () => {
  // Select all elements with the class "setting-link"
  const settingsLinks = document.querySelectorAll(".setting-link");

  // Flag to track if settings have been changed
  let settingsChanged = false;

  // Object to store the default and current settings
  let settings = {
    "Cookies": "Off",
    "Welcome Screen": "On",
    "Background Video": "Loop",
    "Effects Volume": 5,
    "Music Volume": 5
  };

  // Define the options for MultiOptionSetting
  const multiOptionSettingOptions = {
    "Background Video": ["Loop", "Once", "Off"],
    "Effects Volume": ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    "Music Volume": ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
  };

  // Function to update the 'expires' attribute of a cookie
  function updateCookie(setting, newState) {
    const expirationDate = getOneYearFromNow();
    document.cookie = `${setting}=${newState}; expires=${expirationDate}; path=/`;
  }

  // Load settings from cookies
  Object.keys(multiOptionSettingOptions).forEach((setting) => {
    const cookieValue = document.cookie.split('; ').find(row => row.startsWith(`${setting}=`));
    if (cookieValue) {
      settings[setting] = cookieValue.split('=')[1];
    } else {
      // Set default value if no cookie is found
      settings[setting] = multiOptionSettingOptions[setting][0];
      // Set a cookie with a one-year expiration for new settings
      updateCookie(setting, settings[setting]);
    }
  });

  // Add click event listeners to all setting links
  settingsLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault(); // Prevent navigation

      // Get the current state from the link text
      const currentState = e.currentTarget.textContent.split(": ")[1];

      // Determine the new state
      let newState;
      if (multiOptionSettingOptions[e.currentTarget.dataset.setting]) {
        // Find the index of the current option in multiOptionSettingOptions
        const currentIndex = multiOptionSettingOptions[e.currentTarget.dataset.setting].indexOf(currentState);

        // Determine the index of the new option
        let newIndex;
        if (currentIndex === multiOptionSettingOptions[e.currentTarget.dataset.setting].length - 1) {
          newIndex = 0;
        } else {
          newIndex = currentIndex + 1;
        }

        // Get the new option from multiOptionSettingOptions
        newState = multiOptionSettingOptions[e.currentTarget.dataset.setting][newIndex];
      } else {
        // Toggle between "On" and "Off" for other settings
        newState = (currentState === "On") ? "Off" : "On";
      }

      // Update the link text and span data-char with the new state
      let newSpanElement = document.createElement('span');
      newSpanElement.dataset.char = `${e.currentTarget.dataset.setting}: ${newState}`;
      newSpanElement.textContent = `${e.currentTarget.dataset.setting}: ${newState}`;
      e.currentTarget.innerHTML = '';
      e.currentTarget.appendChild(newSpanElement);

      // Store the new state in settings object
      settings[e.currentTarget.dataset.setting.replace(' ', '')] = newState;

      // Call updateCookie to set the cookie with the new state and one-year expiration
      updateCookie(e.currentTarget.dataset.setting, newState);

      // Mark that settings have been changed
      settingsChanged = true;
    });
  });
});
