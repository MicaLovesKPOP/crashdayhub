// ./settingsManager.js

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

  // Load settings from cookies
  Object.keys(multiOptionSettingOptions).forEach((setting) => {
    const cookieValue = document.cookie.split('; ').find(row => row.startsWith(`${setting}=`));
    if (cookieValue) {
      settings[setting] = cookieValue.split('=')[1];
    } else {
      // Set default value if no cookie is found
      settings[setting] = multiOptionSettingOptions[setting][0];
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
        if (currentIndex === multiOptionSettingOptions[e.currentTarget.dataset.setting].length - 1) { // If it's the last option
          newIndex = 0; // Cycle back to the first option
        } else {
          newIndex = currentIndex + 1; // Otherwise, go to the next option
        }

        // Get the new option from multiOptionSettingOptions
        newState = multiOptionSettingOptions[e.currentTarget.dataset.setting][newIndex];
      } else {
        // Toggle between "On" and "Off" for other settings
        newState = (currentState === "On") ? "Off" : "On";
      }

      // Update the link text and span data-char with the new state
      console.log(e.currentTarget);
      let newSpanElement = document.createElement('span');
      newSpanElement.dataset.char = `${e.currentTarget.dataset.setting}: ${newState}`;
      newSpanElement.textContent = `${e.currentTarget.dataset.setting}: ${newState}`;
      e.currentTarget.innerHTML = '';
      e.currentTarget.appendChild(newSpanElement);
      console.log(newSpanElement);

      // Store the new state in settings object
      settings[e.currentTarget.dataset.setting.replace(' ', '')] = newState;

      // Mark that settings have been changed
      settingsChanged = true;
    });
  });
});
