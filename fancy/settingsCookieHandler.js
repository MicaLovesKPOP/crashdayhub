// ./settingsCookieHandler.js

const iframe = document.querySelector('iframe');
const imageBackground = document.querySelector('.image-background');

const WELCOME_UI_READY_DELAY_MS = 5700;
const SKIP_WELCOME_UI_READY_DELAY_MS = 450;
const UI_VISUAL_FADE_IN_MS = 2000;

const settings = {
  'Cookies': 0,
  'Theme': 0,
  'Welcome Screen': 1,
  'Background Video': 1,
  'Effects Volume': 5,
  'Music Volume': 5
};

window.crashdayHubSettings = settings;
window.crashdayHubUiVisible = false;
window.crashdayHubUiReady = false;

// Theme selection currently exposes only Mica Yellow.
// When more themes are re-enabled, keep the visible order alphabetical:
// AI Green, Classic Blue, Mica Yellow, Redline Red.
// Mica Yellow should remain the default even when it is not first in that list.
const themeIds = ['mica-yellow'];

const settingDefinitions = {
  'Cookies': { type: 'choice', values: ['Off', 'On'] },
  'Theme': { type: 'choice', values: ['Mica Yellow'], requiresCookies: true },
  'Welcome Screen': { type: 'choice', values: ['Off', 'On'], requiresCookies: true, startupOnly: true },
  'Background Video': { type: 'choice', values: ['Off', 'Loop', 'Once'], requiresCookies: true },
  'Effects Volume': { type: 'number', min: 0, max: 10, requiresCookies: true },
  'Music Volume': { type: 'number', min: 0, max: 10, requiresCookies: true }
};

const cookieNames = {
  'Cookies': 'crashdayHubFancyCookies',
  'Theme': 'crashdayHubFancyTheme',
  'Welcome Screen': 'crashdayHubFancyWelcomeScreen',
  'Background Video': 'crashdayHubFancyBackgroundVideo',
  'Effects Volume': 'crashdayHubFancyEffectsVolume',
  'Music Volume': 'crashdayHubFancyMusicVolume'
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

function isSettingDisabled(setting) {
  return Boolean(settingDefinitions[setting]?.requiresCookies && settings.Cookies !== 1);
}

function updateSettingLink(link) {
  const setting = link.dataset.setting;
  const displayValue = getDisplayValue(setting);
  const disabled = isSettingDisabled(setting);
  const item = link.closest('li');

  link.innerHTML = `<span data-char="${setting}: ${displayValue}">${setting}: ${displayValue}</span>`;
  link.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  item?.classList.toggle('menu-option-disabled', disabled);
  item?.setAttribute('aria-disabled', disabled ? 'true' : 'false');
}

function updateAllSettingLinks() {
  document.querySelectorAll('.setting-link').forEach(updateSettingLink);
  window.crashdayHubMenuSync?.();
}

function applyStartupOnlySettings() {
  if (settings['Welcome Screen'] === 0) {
    document.body.classList.add('skip-welcome');
  }
}

function markUiReadyAfterIntro() {
  const readyDelay = settings['Welcome Screen'] === 0 ? SKIP_WELCOME_UI_READY_DELAY_MS : WELCOME_UI_READY_DELAY_MS;
  const visibleDelay = Math.max(0, readyDelay - UI_VISUAL_FADE_IN_MS);

  window.setTimeout(() => {
    window.crashdayHubUiVisible = true;
    document.body.classList.add('ui-visible');
    window.crashdayHubMenuSync?.();
  }, visibleDelay);

  window.setTimeout(() => {
    window.crashdayHubUiReady = true;
    document.body.classList.add('ui-ready');
    window.crashdayHubMenuSync?.();
  }, readyDelay);
}

function applyTheme() {
  document.body.dataset.theme = themeIds[settings.Theme] ?? themeIds[0];
}

function applyLiveSettings(settingChanged = null) {
  applyTheme();

  if (iframe && imageBackground) {
    const backgroundMode = settings['Background Video'];
    const videoIsOff = backgroundMode === 0;

    iframe.style.display = videoIsOff ? 'none' : '';
    imageBackground.style.display = videoIsOff ? 'block' : '';

    if (settingChanged === 'Background Video') {
      window.crashdayHubBackgroundVideoModeChanged?.(backgroundMode);
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

  if (isSettingDisabled(setting)) {
    return;
  }

  const nextValue = getNextSettingValue(setting, direction);
  if (nextValue === settings[setting]) {
    return;
  }

  settings[setting] = nextValue;

  if (setting !== 'Welcome Screen') {
    applyLiveSettings(setting);
  }

  saveSettings();
  updateAllSettingLinks();
}

window.crashdayHubAdjustSetting = adjustSettingByLink;

document.addEventListener('DOMContentLoaded', () => {
  const settingsLinks = document.querySelectorAll('.setting-link');

  loadSettingsFromCookies();
  applyStartupOnlySettings();
  applyLiveSettings();
  markUiReadyAfterIntro();

  settingsLinks.forEach((link) => {
    updateSettingLink(link);

    // Menu activation is owned by menuInteractionHandler.js so mouse, keyboard,
    // and gamepad-like navigation all go through the same path. This listener
    // only prevents the raw href="#" fallback from changing the URL/scroll.
    link.addEventListener('click', (event) => {
      event.preventDefault();
    });
  });

  updateAllSettingLinks();
});
