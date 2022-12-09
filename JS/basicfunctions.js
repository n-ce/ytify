import { themer,getSaved, save } from './constants.js';

// settings panel toggle

document.querySelector('#settingsButton')
  .addEventListener('click',
    () => {
      document.querySelector('#settingsContainer')
        .classList.toggle('show');
    });

// fullscreen

let fullscreen = true;

document.querySelector('#fullscreenButton')
  .addEventListener('click',
    () => {
      fullscreen ?
        document.documentElement.requestFullscreen() :
        document.exitFullscreen();
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
save('title','now playing');
shareButton
  .addEventListener('click',
    () => {
      if (navigator.share) {
        navigator.share({
          title: 'ytify',
          text: getSaved('title'),
          url: location.href,
        })
      }
      else {
        navigator.clipboard.writeText(location.href);
        shareButton.innerText = 'check_circle';
      }
    });

// Theme toggle

save('image','Assets/default_thumbnail.avif');

let theme = 'default';

if (getSaved('theme')) {
  theme = getSaved('theme');
}

themer(getSaved('image'), theme);

document.querySelector('#themeButton').addEventListener('click', () => {
  if (theme == 'default') {
    theme = 'dark';
  }
  else if (theme == 'dark') {
    theme = 'black';
  }
  else if (theme == 'black') {
    theme = 'default';
  }
  themer(getSaved('image'), theme);
});
