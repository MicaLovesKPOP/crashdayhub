// ./staticBackgroundHandler.js

const STATIC_BACKGROUND_IMAGE_EXTENSIONS = /\.(avif|webp|jpe?g|png|gif)$/i;

const STATIC_BACKGROUND_SOURCES = [
  {
    repoPath: 'fancy/resources/static-bg',
    publicPath: './resources/static-bg/'
  },
  {
    repoPath: 'fancy/static-bg',
    publicPath: './static-bg/'
  },
  {
    repoPath: 'static-bg',
    publicPath: '../static-bg/'
  }
];

let selectedStaticBackgroundUrl = '';
let staticBackgroundPromise;

function getRandomArrayItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function encodePathParts(path) {
  return path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

async function loadStaticBackgroundFilesFromGitHub(source) {
  const apiUrl = `https://api.github.com/repos/MicaLovesKPOP/crashdayhub/contents/${encodePathParts(source.repoPath)}?ref=main`;
  const response = await fetch(apiUrl, { headers: { Accept: 'application/vnd.github+json' } });

  if (!response.ok) {
    return [];
  }

  const items = await response.json();
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => item.type === 'file' && STATIC_BACKGROUND_IMAGE_EXTENSIONS.test(item.name))
    .map((item) => `${source.publicPath}${encodeURIComponent(item.name)}`);
}

async function pickRandomStaticBackgroundUrl() {
  for (const source of STATIC_BACKGROUND_SOURCES) {
    const files = await loadStaticBackgroundFilesFromGitHub(source);

    if (files.length > 0) {
      return getRandomArrayItem(files);
    }
  }

  return '';
}

async function useRandomStaticBackground({ forceNew = false } = {}) {
  const imageBackground = document.querySelector('.image-background');
  if (!imageBackground) return '';

  if (!selectedStaticBackgroundUrl || forceNew) {
    staticBackgroundPromise = staticBackgroundPromise || pickRandomStaticBackgroundUrl();
    selectedStaticBackgroundUrl = await staticBackgroundPromise;
  }

  if (selectedStaticBackgroundUrl) {
    imageBackground.style.backgroundImage = `url("${selectedStaticBackgroundUrl}")`;
  }

  return selectedStaticBackgroundUrl;
}

window.crashdayHubUseRandomStaticBackground = useRandomStaticBackground;

document.addEventListener('DOMContentLoaded', () => {
  // Start discovery early so the image is likely ready by the time static mode is selected.
  useRandomStaticBackground();
});
