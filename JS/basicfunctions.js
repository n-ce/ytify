import { themer, getSaved, save, query, image } from './constants.js';

// settings panel toggle

document.querySelector('#settingsButton')
  .addEventListener('click',
    () => {
      document.querySelector('#settingsContainer')
        .classList.toggle('show');
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

document.querySelector('#inputToggleButton')
  .addEventListener('click',
    () => {
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
          text: document.querySelector('#title').innerText,
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

if (getSaved('quality') == '251,140') {
  qualityButton.classList.add('on');
  quality = false;
}
else {
  save('quality', '600,139,249'); // low
}
qualityButton.addEventListener('click', () => {
  quality ?
    save('quality', '251,140') : // high
    save('quality', '600,139,249'); // low
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