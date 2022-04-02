let bool = true;
const a = document.getElementById('configs');
const b = document.getElementById('player');
const c = document.getElementById('playback');

document.querySelector('h5').addEventListener('click', () => {
  if (bool == true) {
    a.style.display = b.style.display = c.style.display = 'none'
    document.documentElement.requestFullscreen();
    bool = false;
  }
  else {
    a.style.display = b.style.display = c.style.display = 'flex';
    document.exitFullscreen();
    bool = true;
  }
});
