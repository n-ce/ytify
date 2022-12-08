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
      location.reload();
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
          text: 'title',
          url: location.href,
        })
      }
      else {
        navigator.clipboard.writeText(location.href);
        shareButton.innerText = 'check_circle';
      }
    });
