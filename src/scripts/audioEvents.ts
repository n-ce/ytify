import { audio, playButton, queuelist, superInput } from "../lib/dom";
import player from "../lib/player";
import { convertSStoHHMMSS, getCollection, params } from "../lib/utils";
import { addToCollection } from "./library";
import { appendToQueuelist, firstItemInQueue } from "./queue";


const streamHistory: string[] = [];
const playSpeed = <HTMLSelectElement>document.getElementById('playSpeed');
const seekBwdButton = <HTMLButtonElement>document.getElementById('seekBwdButton');
const seekFwdButton = <HTMLButtonElement>document.getElementById('seekFwdButton');
const progress = <HTMLInputElement>document.getElementById('progress');
const currentDuration = <HTMLParagraphElement>document.getElementById('currentDuration');
const fullDuration = <HTMLParagraphElement>document.getElementById('fullDuration');
const playPrevButton = <HTMLButtonElement>document.getElementById('playPrevButton');
const playNextButton = <HTMLButtonElement>document.getElementById('playNextButton');
const loopButton = <HTMLButtonElement>document.getElementById('loopButton');
const volumeChanger = <HTMLInputElement>document.getElementById('volumeChanger');
const volumeIcon = <HTMLLabelElement>volumeChanger.previousElementSibling;


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
  if (!audio.dataset.id) return;
  if (playButton.dataset.state) {
    audio.play();
    playButton.dataset.state = '';
  } else {
    audio.pause();
    playButton.dataset.state = '1';
  }
  updatePositionState();
});


let historyID: string | undefined = '';
let historyTimeoutId = 0;

audio.addEventListener('playing', () => {
  playButton.classList.replace(playButton.className, 'ri-pause-circle-fill');
  playButton.dataset.state = '';
  if (!streamHistory.includes(<string>audio.dataset.id))
    streamHistory.push(audio.dataset.id || '');
  if ((<HTMLElement>getCollection('history').firstElementChild)?.dataset.id !== audio.dataset.id)
    historyTimeoutId = window.setTimeout(() => {
      if (historyID === audio.dataset.id)
        addToCollection('history', audio.dataset);
    }, 1e4);
});

audio.addEventListener('pause', () => {
  playButton.classList.replace('ri-pause-circle-fill', 'ri-play-circle-fill');
  playButton.dataset.state = '1';
  clearTimeout(historyTimeoutId);
});


audio.addEventListener('loadeddata', () => {
  playButton.classList.replace('ri-loader-3-line', 'ri-play-circle-fill');

  if (superInput.value || streamHistory.length || params.has('url') || params.has('text'))
    audio.play();
  historyID = audio.dataset.id;
  clearTimeout(historyTimeoutId);
});


audio.addEventListener('waiting', () => {
  playButton.classList.replace(playButton.className, 'ri-loader-3-line');
  clearTimeout(historyTimeoutId);
});


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

  progress.value = seconds.toString();
  currentDuration.textContent = convertSStoHHMMSS(seconds);

});


audio.addEventListener('loadedmetadata', () => {
  progress.value = '0';
  progress.min = '0';
  progress.max = Math.floor(audio.duration).toString();
  fullDuration.textContent = convertSStoHHMMSS(audio.duration);
});


loopButton.addEventListener('click', () => {
  loopButton.classList.toggle('on');
  audio.loop = !audio.loop;
});



playPrevButton.addEventListener('click', () => {
  if (streamHistory.length > 1) {
    appendToQueuelist(audio.dataset, true);
    streamHistory.pop();
    player(streamHistory[streamHistory.length - 1]);
  }
})



function onEnd() {
  playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
  if (queuelist.childElementCount)
    firstItemInQueue().click();

}

audio.addEventListener('ended', onEnd);

playNextButton.addEventListener('click', onEnd);


volumeIcon.addEventListener('click', () => {
  volumeChanger.value = audio.volume ? '0' : '100';
  audio.volume = audio.volume ? 0 : 1;
  volumeIcon.classList.replace(volumeIcon.className, volumeIcon.className === 'ri-volume-down-line' ? 'ri-volume-mute-line' : 'ri-volume-down-line');

});

volumeChanger.addEventListener('input', () => {
  audio.volume = parseFloat(volumeChanger.value) / 100;

  volumeIcon.classList.replace(volumeIcon.className, audio.volume ? 'ri-volume-down-line' : 'ri-volume-mute-line');

});



if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => {
    audio.play();
    updatePositionState();
  });
  navigator.mediaSession.setActionHandler('pause', () => {
    audio.pause();
    updatePositionState();
  });
  navigator.mediaSession.setActionHandler("seekforward", () => {
    audio.currentTime += 15;
    updatePositionState();
  });
  navigator.mediaSession.setActionHandler("seekbackward", () => {
    audio.currentTime -= 15;
    updatePositionState();
  });
  navigator.mediaSession.setActionHandler("seekto", e => {
    audio.currentTime = e.seekTime || 0;
    updatePositionState();
  });
  navigator.mediaSession.setActionHandler("nexttrack", () => {
    onEnd();
    updatePositionState();
  });
}
