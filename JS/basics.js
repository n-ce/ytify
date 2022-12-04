// settings panel toggle

document.querySelector('#settingsButton')
  .addEventListener('click',
    () => {
      document.querySelector('#settingsContainer')
        .classList.toggle('show');
    });

// fullscreen
let fullscreen = false;

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
()=>{
  document.querySelector('input').classList.toggle('hide');
});
