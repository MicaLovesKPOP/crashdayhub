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

const settingDefinitions = {
  'Cookies': { type: 'choice', values: ['Off', 'On'] },
  'Welcome Screen': { type: 'choice', values: ['Off', 'On'] },
  'Background Video': { type: 'choice', values: ['Off', 'Loop', 'Once'] },
  'Effects Volume': { type: 'number', min: 0, max: 10 },
  'Music Volume': { type: 'number', min: 0, max: 10 }
};

const cookieNames = {
  'Cookies': 'crashdayHubCookies',
  'Welcome Screen': 'crashdayHubWelcomeScreen',
  'Background Video': 'crashdayHubBackgroundVideo',
  'Effects Volume': 'crashdayHubEffectsVolume',
  'Music Volume': 'crashdayHubMusicVolume'
};

function getDisplayValue(setting) {
  const definition = settingDefinitions[setting];

  if (definition?.type === 'choice') {
    return definition.values[settings[setting]] ?? definition.values[0];
  }

  return settings[setting];
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

function updateAllSettingLinks() {
  document.querySelectorAll('.setting-link').forEach(updateSettingLink);
  window.crashdayHubMenuSync?.();
}

function applySettings() {
  if (loadingScreen) {
    loadingScreen.style.display = settings['Welcome Screen'] === 1 ? '' : 'none';
  }

  if (iframe && imageBackground) {
    const backgroundMode = settings['Background Video'];
    const videoIsOff = backgroundMode === 0;

    iframe.style.display = videoIsOff ? 'none' : '';
    imageBackground.style.display = videoIsOff ? 'block' : '';

    if (videoIsOff && window.crashdayHubBackgroundPlayer?.pauseVideo) {
      window.crashdayHubBackgroundPlayer.pauseVideo();
    }

    if (!videoIsOff && window.crashdayHubBackgroundPlayer?.playVideo) {
      window.crashdayHubBackgroundPlayer.playVideo();
    }
  }
}

function loadSettingsFromCookies() {
  if (getCookie(cookieNames.Cookies) !== '1') {
    return;
  }

  Object.keys(settings).forEach((setting) => {
    const rawValue = getCookie(cookieNames[setting]);
    const parsedValue = Number.parseInt(rawValue, 10);
    const definition = settingDefinitions[setting];

    if (!Number.isInteger(parsedValue) || !definition) {
      return;
    }

    if (definition.type === 'choice') {
      settings[setting] = Math.max(0, Math.min(definition.values.length - 1, parsedValue));
    } else if (definition.type === 'number') {
      settings[setting] = Math.max(definition.min, Math.min(definition.max, parsedValue));
    }
  });
}

function getNextSettingValue(setting, direction = 1) {
  const currentValue = settings[setting];
  const definition = settingDefinitions[setting];

  if (!definition) {
    return currentValue;
  }

  if (definition.type === 'choice') {
    return (currentValue + direction + definition.values.length) % definition.values.length;
  }

  if (definition.type === 'number') {
    return Math.max(definition.min, Math.min(definition.max, currentValue + direction));
  }

  return currentValue;
}

function adjustSettingByLink(link, direction = 1) {
  const setting = link?.dataset.setting;
  if (!setting || !(setting in settings)) return;

  const nextValue = getNextSettingValue(setting, direction);
  if (nextValue === settings[setting]) {
    return;
  }

  settings[setting] = nextValue;
  applySettings();
  saveSettings();
  updateAllSettingLinks();
}

window.crashdayHubAdjustSetting = adjustSettingByLink;

document.addEventListener('DOMContentLoaded', () => {
  const settingsLinks = document.querySelectorAll('.setting-link');

  loadSettingsFromCookies();
  applySettings();

  settingsLinks.forEach((link) => {
    updateSettingLink(link);

    link.addEventListener('click', (event) => {
      event.preventDefault();
      adjustSettingByLink(event.currentTarget, 1);
    });
  });

  updateAllSettingLinks();
});
