// ./settingsCookieHandler.js

const iframe = document.querySelector('iframe');
const imageBackground = document.querySelector('.image-background');
const loadingScreen = document.querySelector('.loading-screen');

const settings = {
  'Cookies': 0,
  'Welcome Screen': 1,
  'Background Video': 1,
  'Effects Volume': 5,
  'Music Volume': 5
};

window.crashdayHubSettings = settings;

const displayValues = {
  'Cookies': ['Off', 'On'],
  'Welcome Screen': ['Off', 'On'],
  'Background Video': ['Off', 'Loop', 'Once']
};

const cookieNames = {
  'Cookies': 'crashdayHubCookies',
  'Welcome Screen': 'crashdayHubWelcomeScreen',
  'Background Video': 'crashdayHubBackgroundVideo',
  'Effects Volume': 'crashdayHubEffectsVolume',
  'Music Volume': 'crashdayHubMusicVolume'
};

function getDisplayValue(setting) {
  return displayValues[setting] ? displayValues[setting][settings[setting]] : settings[setting];
}

function getOneYearFromNow() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toUTCString();
}

function getCookie(name) {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
}

function setCookie(setting, value) {
  const name = cookieNames[setting];
  if (!name) return;

  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${getOneYearFromNow()}; path=/; SameSite=Lax`;
}

function deleteManagedCookies() {
  Object.values(cookieNames).forEach((name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  });
}

function saveSettings() {
  if (settings.Cookies !== 1) {
    deleteManagedCookies();
    return;
  }

  Object.keys(settings).forEach((setting) => setCookie(setting, settings[setting]));
}

function updateSettingLink(link) {
  const setting = link.dataset.setting;
  const displayValue = getDisplayValue(setting);

  link.innerHTML = `<span data-char="${setting}: ${displayValue}">${setting}: ${displayValue}</span>`;
}

function applySettings() {
  if (loadingScreen) {
    loadingScreen.style.display = settings['Welcome Screen'] === 1 ? '' : 'none';
  }

  if (iframe && imageBackground) {
    const backgroundMode = settings['Background Video'];
    iframe.style.display = backgroundMode === 0 ? 'none' : '';
    imageBackground.style.display = backgroundMode === 0 ? 'block' : '';
  }
}

function loadSettingsFromCookies() {
  if (getCookie(cookieNames.Cookies) !== '1') {
    return;
  }

  Object.keys(settings).forEach((setting) => {
    const rawValue = getCookie(cookieNames[setting]);
    const parsedValue = Number.parseInt(rawValue, 10);

    if (Number.isInteger(parsedValue)) {
      settings[setting] = parsedValue;
    }
  });
}

function getNextSettingValue(setting) {
  const currentValue = settings[setting];

  if (displayValues[setting]) {
    return (currentValue + 1) % displayValues[setting].length;
  }

  if (setting === 'Effects Volume' || setting === 'Music Volume') {
    return currentValue < 10 ? currentValue + 1 : 0;
  }

  return currentValue === 0 ? 1 : 0;
}

document.addEventListener('DOMContentLoaded', () => {
  const settingsLinks = document.querySelectorAll('.setting-link');

  loadSettingsFromCookies();
  applySettings();

  settingsLinks.forEach((link) => {
    updateSettingLink(link);

    link.addEventListener('click', (event) => {
      event.preventDefault();

      const setting = event.currentTarget.dataset.setting;
      settings[setting] = getNextSettingValue(setting);

      updateSettingLink(event.currentTarget);
      applySettings();
      saveSettings();
    });
  });
});
