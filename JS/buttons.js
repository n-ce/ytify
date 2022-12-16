import { themer, getSaved, save, query, image, audio } from './constants.js';

// settings panel toggle

const settingsButton = document.querySelector('#settingsButton')
let settingsPanel = true;

settingsButton.addEventListener('click',
  () => {
    if (settingsPanel) {
      settingsButton.style.transform = 'rotate(120deg)';
    }
    else {
      settingsButton.style.transform = 'rotate(0deg)';
    }
    settingsButton.classList.toggle('on');
    document.querySelector('#settingsContainer').classList.toggle('show');
    settingsPanel = !settingsPanel;
  });

// fullscreen

let fullscreen = true;
const fullscreenButton = document.querySelector('#fullscreenButton');
fullscreenButton.addEventListener('click',
  () => {
    if (fullscreen) {
      document.documentElement.requestFullscreen();
      fullscreenButton.innerText = 'fullscreen_exit';
    }
    else {
      document.exitFullscreen();
      fullscreenButton.innerText = 'fullscreen';
    }
    fullscreen = !fullscreen;
  });

// info

document.querySelector('#infoButton')
  .addEventListener('click',
    () => {
      if (
        confirm("The about page will be opened in a new tab. Continue?")
      ) {
        window.open("https://github.com/n-ce/ytify#about");
      }
    });

// delete all saved data

document.querySelector('#deleteDataButton')
  .addEventListener('click',
    () => {
      localStorage.clear();
      location.replace(location.origin);
    });

// input bar toggle

const inputToggleButton = document.querySelector('#inputToggleButton')

inputToggleButton.addEventListener('click',
  () => {
    inputToggleButton.classList.toggle('on');
    document.querySelector('input').classList.toggle('hide');
  });

// queue Buttons Toggle

document.querySelector('#queueButton')
  .addEventListener('click',
    () => {
      document.querySelector('#queueButtons').classList.toggle('hide');
    });

// Navigator Share Checker

const shareButton = document.querySelector('#shareButton');

if (!navigator.share) {
  shareButton.innerText = 'link';

  if (!navigator.clipboard) {
    shareButton.style.display = 'none';
  }
}

shareButton
  .addEventListener('click',
    () => {
      if (navigator.share) {
        navigator.share({
          title: 'ytify',
          text: document.querySelector('#title').innerText + ' - ' + document.querySelector('#author').innerText,
          url: location.href,
        })
      }
      else {
        navigator.clipboard.writeText(location.href);
        shareButton.innerText = 'check_circle';
      }
    });

// Theme toggle
const themeButton = document.querySelector('#themeButton');

themeButton.addEventListener('click', () => {
  if (getSaved('theme') == 'dark') {
    localStorage.removeItem('theme');
    themeButton.innerText = 'dark_mode';
  }
  else {
    save('theme', 'dark');
    themeButton.innerText = 'light_mode';
  }

  themer();
});


// quality

const qualityButton = document.querySelector('#qualityButton');

let quality = true;

if (getSaved('quality') == 'hq') {
  qualityButton.classList.add('on');
  quality = false;
}

qualityButton.addEventListener('click', () => {
  quality ?
    save('quality', 'hq') : // high
    localStorage.removeItem('quality'); // low
  qualityButton.classList.toggle('on');
  quality = !quality;
});


// thumbnail toggle

const thumbnailButton = document.querySelector('#thumbnailButton');
const dataContainer = document.querySelector('#dataContainer');
const html = '<div id="metadata"align="center"><p id="title"></p><p id ="author"></p></div>';

let thumbnail = false;
thumbnailButton.addEventListener('click', () => {
  thumbnail ?
    dataContainer.innerHTML = '<img>' + html :
    dataContainer.innerHTML = html;
  thumbnail = !thumbnail;
});

// play button and events

const playButton = document.querySelector('#playButton');

let playback = true;

playButton.addEventListener('click', () => {
  if (playback) {
    audio.play();
    playButton.innerText = 'pause';
  } else {
    audio.pause();
    playButton.innerText = 'play_arrow';
  }
  playback = !playback;
});

audio.onended = () => {
  playButton.innerText = 'stop';
}

// PLAYBACK SPEED
const playSpeed = document.querySelector('#playSpeed');

playSpeed.addEventListener('change', () => {
  if (playSpeed.value < 0 || playSpeed.value > 4) {
    return;
  }
  audio.playbackRate = playSpeed.value;
  playSpeed.blur();
});

// Loop

const loopButton = document.querySelector('#loopButton');

let loop = true;

loopButton.addEventListener('click', () => {
  loop ?
    audio.onended = () => {
      audio.play();
    } :
    audio.onended = () => {
      playButton.innerText = 'stop';
    }
  loopButton.classList.toggle('on');
  loop = !loop;
});