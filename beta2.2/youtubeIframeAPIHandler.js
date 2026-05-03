// ./youtubeIframeAPIHandler.js

const tag = document.createElement('script');
tag.src = 'https://www.youtube.com/iframe_api';

const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

let player;
const youtubeIframe = document.querySelector('iframe');

function getBackgroundVideoSetting() {
  return window.crashdayHubSettings?.['Background Video'] ?? 1;
}

function onYouTubeIframeAPIReady() {
  if (!youtubeIframe || typeof YT === 'undefined') return;

  player = new YT.Player(youtubeIframe, {
    events: {
      onStateChange: onPlayerStateChange
    }
  });
}

function onPlayerStateChange(event) {
  if (event.data !== YT.PlayerState.ENDED) return;

  const backgroundVideoSetting = getBackgroundVideoSetting();

  // 0 = Off, 1 = Loop, 2 = Once
  if (backgroundVideoSetting === 1) {
    player.playVideo();
  } else {
    youtubeIframe.style.display = 'none';
  }
}
