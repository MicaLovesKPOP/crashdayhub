// ./youtubeIframeAPIHandler.js

// Load the IFrame Player API code asynchronously.
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// Convert the existing <iframe> (and YouTube player) into a player after the API code downloads.
let player;
let iframe = document.querySelector('iframe');

function onYouTubeIframeAPIReady() {
    player = new YT.Player(iframe, {
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
}

// The API calls this function when the player's state changes.
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
      if (settings['Background Video'] === 'Loop') {
        player.playVideo(); // Replay the video
      } else {
        // Change the CSS display property to 'none'
        iframe.style.display = 'none';
      }
    }
}
