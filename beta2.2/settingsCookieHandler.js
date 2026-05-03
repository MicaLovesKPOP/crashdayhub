// ./settingsCookieHandler.js

const iframe = document.querySelector('iframe');
const imageBackground = document.querySelector('.image-background');
const loadingScreen = document.querySelector('.loading-screen');

const settings = {
  'Cookies': 0,
  'Welcome Screen': 1,
  'Background Video': 1,
  'Sound Output': 1,
  'Main Volume': 7,
  'Effect Volume': 7,
  'Engine Volume': 7,
  'Voice Volume': 0,
  'Music': 0,
  'Music Volume': 0,
  'Steam Music': 0
};

window.crashdayHubSettings = settings;

const settingDefinitions = {
  'Cookies': { type: 'toggle', values: ['Off', 'On'] },
  'Welcome Screen': { type: 'toggle', values: ['Off', 'On'] },
  'Background Video': { type: 'choice', values: ['Off', 'Loop', 'Once'] },
  'Sound Output': { type: 'toggle', values: ['Off', 'On'] },
  'Main Volume': { type: 'slider', min: 0, max: 7 },
  'Effect Volume': { type: 'slider', min: 0, max: 7 },
  'Engine Volume': { type: 'slider', min: 0, max: 7 },
  'Voice Volume': { type: 'slider', min: 0, max: 7, disabled: true },
  'Music': { type: 'toggle', values: ['Off', 'On'] },
  'Music Volume': { type: 'slider', min: 0, max: 7, disabledWhen: () => settings.Music === 0 },
  'Steam Music': { type: 'toggle', values: ['Off', 'On'], disabledWhen: () => settings.Music === 0 }
};

const cookieNames = {
  'Cookies': 'crashdayHubCookies',
  'Welcome Screen': 'crashdayHubWelcomeScreen',
  'Background Video': 'crashdayHubBackgroundVideo',
  'Sound Output': 'crashdayHubSoundOutput',
  'Main Volume': 'crashdayHubMainVolume',
  'Effect Volume': 'crashdayHubEffectVolume',
  'Engine Volume': 'crashdayHubEngineVolume',
  'Voice Volume': 'crashdayHubVoiceVolume',
  'Music': 'crashdayHubMusic',
  'Music Volume': 'crashdayHubMusicVolume',
  'Steam Music': 'crashdayHubSteamMusic'
};

function isSettingDisabled(setting) {
  const definition = settingDefinitions[setting];
  return Boolean(definition?.disabled || definition?.disabledWhen?.());
}

function getDisplayValue(setting) {
  const definition = settingDefinitions[setting];

  if (definition?.values) {
    return definition.values[settings[setting]] ?? settings[setting];
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

function getSliderSegments(setting) {
  const definition = settingDefinitions[setting];
  const value = settings[setting];
  const max = definition.max ?? 7;

  return Array.from({ length: max }, (_, index) => {
    const filled = index < value;
    return `<span class="option-slider-segment${filled ? ' filled' : ''}"></span>`;
  }).join('');
}

function updateSettingLink(link) {
  const setting = link.dataset.setting;
  const definition = settingDefinitions[setting];
  if (!definition) return;

  const item = link.closest('li');
  const disabled = isSettingDisabled(setting);
  item?.classList.toggle('disabled', disabled);
  item?.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  link.setAttribute('aria-disabled', disabled ? 'true' : 'false');

  const label = setting === 'Sound Output' ? 'Enable Sound Output' : setting === 'Music' ? 'Enable Music' : setting;
  const displayValue = getDisplayValue(setting);

  if (definition.type === 'slider') {
    link.innerHTML = `
      <span class="option-label" data-char="${label}">${label}</span>
      <span class="option-control option-slider" aria-hidden="true">${getSliderSegments(setting)}</span>
    `;
    return;
  }

  link.innerHTML = `
    <span class="option-label" data-char="${label}">${label}</span>
    <span class="option-control option-toggle" data-value="${displayValue}">
      <span class="option-value">${displayValue}</span>
    </span>
  `;
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

function getNextSettingValue(setting, direction = 1) {
  const definition = settingDefinitions[setting];
  const currentValue = settings[setting];

  if (definition.values) {
    return (currentValue + direction + definition.values.length) % definition.values.length;
  }

  if (definition.type === 'slider') {
    const min = definition.min ?? 0;
    const max = definition.max ?? 7;
    return Math.max(min, Math.min(max, currentValue + direction));
  }

  return currentValue;
}

function adjustSettingByLink(link, direction = 1) {
  const setting = link?.dataset.setting;
  if (!setting || !settingDefinitions[setting] || isSettingDisabled(setting)) return;

  settings[setting] = getNextSettingValue(setting, direction);

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
