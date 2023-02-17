import {
  settingsButton,
  queueButton,
  loopButton,
  themer,
  getSaved,
  save,
  image,
  audio,
  progress,
  convertSStoMMSS
} from './constants.js';



// settings panel toggle

let settingsPanel = true;
let style;

settingsButton.addEventListener('click',
  () => {
    settingsPanel ?
      style = ['rotate(180deg) scale(0.9)', 'flex'] :
      style = ['rotate(0deg)', 'none'];
    settingsButton.style.transform = style[0];
    document.querySelector('#settingsContainer').style.display = style[1];
    settingsButton.classList.toggle('on');
    settingsPanel = !settingsPanel;
  });



// Theme toggle
const themeButton = document.querySelector('#themeButton');

let colorSchemeQueryList = matchMedia('(prefers-color-scheme: dark)');
//prefers color scheme
const setColorScheme = e => {
  e.matches ?
    save('theme', 'dark') :
    localStorage.removeItem('theme');
  themeButton.classList.toggle('on');
  themer();
}
setColorScheme(colorSchemeQueryList);
colorSchemeQueryList.addListener(setColorScheme);


if (getSaved('theme')) themeButton.classList.add('on');

themeButton.addEventListener('click', () => {
  getSaved('theme') ?
    localStorage.removeItem('theme') :
    save('theme', 'dark');
  themeButton.classList.toggle('on');
  themer();
});



// fullscreen

let fullscreen = true;
const fullscreenButton = document.querySelector('#fullscreenButton');
fullscreenButton.addEventListener('click',
  () => {
    fullscreen ?
      document.documentElement.requestFullscreen() :
      document.exitFullscreen();

    fullscreenButton.classList.toggle('on');
    fullscreen = !fullscreen;
  });



// thumbnail toggle

const thumbnailButton = document.querySelector('#thumbnailButton');

let thumbnail = true;

thumbnailButton.addEventListener('click', () => {
  if (thumbnail) {
    save('thumbnail', image.src);
  } else {
    image.src = getSaved('thumbnail');
    localStorage.removeItem('thumbnail');
  }
  thumbnail = !thumbnail;
  thumbnailButton.classList.toggle('on');
  image.classList.toggle('hide');
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
  location.href += '&t=' + Math.floor(audio.currentTime);
  qualityButton.classList.toggle('on');
  quality = !quality;
});



// info

document.querySelector('#githubButton')
  .addEventListener('click',
    () => window.open("https://github.com/n-ce/ytify")
  );



// delete all saved data

document.querySelector('#deleteDataButton')
  .addEventListener('click',
    () => {
      if (confirm('Clear all saved data?')) {
        localStorage.clear();
        location.replace(location.origin);
      }
    });



// play button and events

const playButton = document.querySelector('#playButton');

let playback = true;

playButton.addEventListener('click', () => {
  playback ?
    audio.play() :
    audio.pause();
  playback = !playback;
});

audio.addEventListener('playing', () => {
  playButton.classList.add('on');
  playButton.classList.replace(playButton.classList[0], 'ri-pause-fill')
  playback = false;
});

audio.addEventListener('pause', () => {
  playback = true;
  playButton.classList.replace('ri-pause-fill', 'ri-play-fill');
});



// PLAYBACK SPEED

const playSpeed = document.querySelector('#playSpeed');

playSpeed.addEventListener('change', () => {
  if (playSpeed.value < 0 || playSpeed.value > 4) {
    return;
  }
  audio.playbackRate = playSpeed.value;
  playSpeed.blur();
});



// PROGRESS Bar event

progress.addEventListener('change', () => {
  if (progress.value < 0 || progress.value > audio.duration) {
    return;
  }
  audio.currentTime = progress.value;
  progress.blur();
});

audio.addEventListener('timeupdate', () => {
  if (progress === document.activeElement) return;

  progress.value = Math.floor(audio.currentTime);
  document.querySelector('#currentDuration').innerText = convertSStoMMSS(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
  progress.value = 0;
  progress.min = 0;
  progress.max = Math.floor(audio.duration);
  document.querySelector('#fullDuration').innerText = convertSStoMMSS(audio.duration);
});

// Loop


let loop = false;

audio.addEventListener('ended', () => {
  if (loop) {
    audio.play();
  }
  else {
    playButton.classList.replace('ri-play-fill', 'ri-stop-fill');
    playback = true;
  }
});

loopButton.addEventListener('click', () => {
  loopButton.classList.toggle('on');
  loop = !loop;
});