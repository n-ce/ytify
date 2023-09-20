import { audio, pipedInstances, playButton, queuelist, superInput } from "../lib/dom";
import player from "../lib/player";
import { convertSStoHHMMSS } from "../lib/utils";
import { appendToQueuelist, streamHistory } from "./superModal";


const playSpeed = <HTMLSelectElement>document.getElementById('playSpeed');

const seekBwdButton = <HTMLButtonElement>document.getElementById('seekBwdButton');

const seekFwdButton = <HTMLButtonElement>document.getElementById('seekFwdButton');

const progress = <HTMLInputElement>document.getElementById('progress');

const currentDuration = <HTMLParagraphElement>document.getElementById('currentDuration');

const fullDuration = <HTMLParagraphElement>document.getElementById('fullDuration');

const playPrevButton = <HTMLButtonElement>document.getElementById('playPrevButton');

const playNextButton = <HTMLButtonElement>document.getElementById('playNextButton');

function updatePositionState() {
  if ('mediaSession' in navigator) {
    if ('setPositionState' in navigator.mediaSession) {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate,
        position: audio.currentTime,
      });
    }
  }
}


playButton.addEventListener('click', () => {
  if (playButton.dataset.state) {
    audio.play();
    playButton.dataset.state = '';
  } else {
    audio.pause();
    playButton.dataset.state = '1';
  }
  updatePositionState();
});


audio.addEventListener('playing', () => {
  playButton.classList.replace(playButton.classList[0], 'ri-pause-line');
  playButton.dataset.state = '';
  if (!streamHistory.includes(audio.dataset.id || ''))
    streamHistory.push(audio.dataset.id || '');
});

audio.addEventListener('pause', () => {
  playButton.classList.replace('ri-pause-line', 'ri-play-line');
  playButton.dataset.state = '1';
});

audio.addEventListener('loadstart', () => {
  setTimeout(
    () => {
      if (playButton.classList.contains('ri-loader-3-line')) {
        pipedInstances.selectedIndex++;
        player(audio.dataset.id);
      }
    }, 10000);
})


audio.addEventListener('loadeddata', () => {
  playButton.classList.replace('ri-loader-3-line', 'ri-play-line');

  if (superInput.value || streamHistory.length)
    audio.play();
});

audio.addEventListener('waiting', () => {
  playButton.classList.replace(playButton.classList[0], 'ri-loader-3-line');
})


playSpeed.addEventListener('change', () => {
  const speed = parseFloat(playSpeed.value);

  if (speed < 0 || speed > 4) {
    return;
  }
  audio.playbackRate = speed;
  updatePositionState();
  playSpeed.blur();
});


seekFwdButton.addEventListener('click', () => {
  audio.currentTime += 15;
  updatePositionState();
});


seekBwdButton.addEventListener('click', () => {
  audio.currentTime -= 15;
  updatePositionState();
});


progress.addEventListener('change', () => {
  const value = parseInt(progress.value);
  if (value < 0 || value > audio.duration)
    return;

  audio.currentTime = value;
  progress.blur();
});

audio.addEventListener('timeupdate', () => {
  if (progress === document.activeElement)
    return;

  const seconds = Math.floor(audio.currentTime);
  const data = parseInt(audio.dataset.seconds || '0');
  // only update every second
  if (seconds > data) {
    progress.value = seconds.toString();
    currentDuration.textContent = convertSStoHHMMSS(seconds);
  }
  audio.dataset.seconds = seconds.toString();
});


audio.addEventListener('loadedmetadata', () => {
  progress.value = '0';
  progress.min = '0';
  progress.max = Math.floor(audio.duration).toString();
  fullDuration.textContent = convertSStoHHMMSS(audio.duration);
});


const loopButton = <HTMLButtonElement>document.getElementById('loopButton');
loopButton.addEventListener('click', () => {
  loopButton.classList.toggle('on');
  audio.loop = !audio.loop;
});


function onEnd() {
  if (queuelist.childElementCount)
    (<HTMLElement>queuelist.firstElementChild).click();
}

audio.addEventListener('ended', onEnd);



playPrevButton.addEventListener('click', () => {
  if (streamHistory.length > 1) {
    appendToQueuelist({
      title: audio.dataset.name,
      author: audio.dataset.author,
      id: audio.dataset.id,
      thumbnail: audio.dataset.thumbnail,
      duration: audio.dataset.duration
    }, true);
    streamHistory.pop();
    player(streamHistory[streamHistory.length - 1]);
  }
})


playNextButton.addEventListener('click', onEnd);

