// ./youtubeIframeAPIHandler.js

const tag = document.createElement('script');
tag.src = 'https://www.youtube.com/iframe_api';

const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

let player;
let loopTimer;
const youtubeIframe = document.querySelector('iframe');

function getBackgroundVideoSetting() {
  return window.crashdayHubSettings?.['Background Video'] ?? 1;
}

function shouldLoopBackgroundVideo() {
  return getBackgroundVideoSetting() === 1;
}

function clearLoopTimer() {
  if (loopTimer) {
    window.clearInterval(loopTimer);
    loopTimer = undefined;
  }
}

function startLoopTimer() {
  clearLoopTimer();

  loopTimer = window.setInterval(() => {
    if (!player || !shouldLoopBackgroundVideo()) return;

    const duration = player.getDuration?.();
    const currentTime = player.getCurrentTime?.();

    if (!duration || typeof currentTime !== 'number') return;

    // Restart just before YouTube reaches the natural end state. This avoids
    // most of the default play/pause/previous/next overlay that appears on loop.
    if (duration - currentTime <= 0.35) {
      player.seekTo(0, true);
      player.playVideo();
    }
  }, 250);
}

function onYouTubeIframeAPIReady() {
  if (!youtubeIframe || typeof YT === 'undefined') return;

  player = new YT.Player(youtubeIframe, {
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    }
  });

  window.crashdayHubBackgroundPlayer = player;
}

function onPlayerReady() {
  window.crashdayHubBackgroundPlayer = player;

  if (getBackgroundVideoSetting() === 0) {
    player.pauseVideo();
    return;
  }

  player.playVideo();

  if (shouldLoopBackgroundVideo()) {
    startLoopTimer();
  }
}

function onPlayerStateChange(event) {
  const backgroundVideoSetting = getBackgroundVideoSetting();

  if (event.data === YT.PlayerState.PLAYING && backgroundVideoSetting === 1) {
    startLoopTimer();
    return;
  }

  if (event.data !== YT.PlayerState.ENDED) return;

  // 0 = Off, 1 = Loop, 2 = Once
  if (backgroundVideoSetting === 1) {
    player.seekTo(0, true);
    player.playVideo();
  } else {
    clearLoopTimer();
    youtubeIframe.style.display = 'none';
  }
}
