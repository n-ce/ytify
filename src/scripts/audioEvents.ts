import { audio, listAnchor, playButton, progress, queuelist, title } from "../lib/dom";
import player from "../lib/player";
import { convertSStoHHMMSS, goTo, removeSaved, save } from "../lib/utils";
import { getSaved, params, store } from "../lib/store";
import { appendToQueuelist, firstItemInQueue } from "./queue";
import { addToCollection, getCollection } from "../lib/libraryUtils";
import audioErrorHandler from "../modules/audioErrorHandler";
import getStreamData from "../modules/getStreamData";

const playSpeed = <HTMLSelectElement>document.getElementById('playSpeed');
const seekBwdButton = <HTMLButtonElement>document.getElementById('seekBwdButton');
const seekFwdButton = <HTMLButtonElement>document.getElementById('seekFwdButton');
const currentDuration = <HTMLParagraphElement>document.getElementById('currentDuration');
const fullDuration = <HTMLParagraphElement>document.getElementById('fullDuration');
const playPrevButton = <HTMLButtonElement>document.getElementById('playPrevButton');
const playNextButton = <HTMLButtonElement>document.getElementById('playNextButton');
const loopButton = <HTMLButtonElement>document.getElementById('loopButton');
const volumeChanger = <HTMLInputElement>document.getElementById('volumeChanger');
const volumeIcon = <HTMLLabelElement>volumeChanger.previousElementSibling;


const msn = 'mediaSession' in navigator;
function updatePositionState() {
  if (msn && 'setPositionState' in navigator.mediaSession)
    navigator.mediaSession.setPositionState({
      duration: audio.duration || 0,
      playbackRate: audio.playbackRate || 1,
      position: Math.floor(audio.currentTime || 0),
    });
}


playButton.onclick = function() {
  if (
    store.stream.id &&
    store.player.playbackState === 'playing'
  )
    audio.pause();
  else
    audio.play();
}


let historyID: string | undefined = '';
let historyTimeoutId = 0;


audio.onplaying = function() {
  playButton.classList.replace(playButton.className, 'ri-pause-circle-fill');

  store.player.playbackState = 'playing';

  const id = store.stream.id;

  if (!store.streamHistory.includes(id))
    store.streamHistory.push(id);

  if (getSaved('history') === 'off')
    return;

  const firstElementInHistory = <HTMLElement | null>getCollection('history').firstElementChild;

  if (firstElementInHistory?.dataset.id !== id)
    historyTimeoutId = window.setTimeout(() => {
      if (historyID === id) {
        addToCollection('history', store.stream);
        // just in case we are already in the history collection 
        if (
          listAnchor.classList.contains('view') &&
          params.get('collection') === 'history'
        )
          goTo('history');

      }
    }, 1e4);
}

audio.onpause = function() {
  playButton.classList.replace('ri-pause-circle-fill', 'ri-play-circle-fill');
  store.player.playbackState = 'paused';
  clearTimeout(historyTimeoutId);
}


let isPlayable = false;
const playableCheckerID = setInterval(() => {
  if (store.streamHistory.length || params.has('url') || params.has('text') || !params.has('s')) {
    isPlayable = true;
    clearInterval(playableCheckerID);
  }
}, 500);


audio.onloadstart = function() {
  playButton.classList.replace('ri-loader-3-line', 'ri-play-circle-fill');
  if (isPlayable) audio.play();
  historyID = store.stream.id;
  clearTimeout(historyTimeoutId);

  // persist playback speed
  if (playSpeed.value !== '1.00')
    audio.playbackRate = parseFloat(playSpeed.value);

}


audio.onwaiting = function() {
  playButton.classList.replace(playButton.className, 'ri-loader-3-line');
}


playSpeed.onchange = function() {
  const speed = parseFloat(playSpeed.value);

  if (speed < 0 || speed > 4)
    return;

  audio.playbackRate = speed;
  updatePositionState();
  playSpeed.blur();
}



seekFwdButton.onclick = function() {
  audio.currentTime += 15;
  updatePositionState();
}


seekBwdButton.onclick = function() {
  audio.currentTime -= 15;
  updatePositionState();
}


progress.onchange = function() {
  const value = parseInt(progress.value);

  if (value < 0 || value > audio.duration)
    return;

  audio.currentTime = value;
  progress.blur();
}

audio.ontimeupdate = function() {
  if (progress === document.activeElement)
    return;

  const seconds = Math.floor(audio.currentTime);
  store.lrcSync(seconds);
  progress.value = seconds.toString();
  currentDuration.textContent = convertSStoHHMMSS(seconds);
  updatePositionState();
}


audio.onloadedmetadata = function() {
  title.textContent = store.stream.title;
  progress.value = '0';
  progress.min = '0';
  progress.max = Math.floor(audio.duration).toString();
  fullDuration.textContent = convertSStoHHMMSS(audio.duration);
}


audio.oncanplaythrough = function() {
  // prefetch beforehand to speed up experience
  const nextItem = store.queue[0];
  if (nextItem)
    getStreamData(nextItem, true);
}

audio.onerror = audioErrorHandler;


loopButton.onclick = function() {
  loopButton.classList.toggle('on');
  audio.loop = !audio.loop;
}


function prev() {
  if (store.streamHistory.length > 1) {
    appendToQueuelist(store.stream, true);
    store.streamHistory.pop();
    player(store.streamHistory[store.streamHistory.length - 1]);
  }
}

playPrevButton.onclick = prev;


function onEnd() {
  playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
  if (queuelist.childElementCount)
    firstItemInQueue().click();
}

audio.onended = playNextButton.onclick = onEnd;


volumeIcon.onclick = function() {
  volumeChanger.value = audio.volume ? '0' : '100';
  audio.volume = audio.volume ? 0 : 1;
  volumeIcon.classList.replace(
    volumeIcon.className,
    `ri-volume-${volumeIcon.className.includes('mute') ? 'up' : 'mute'
    }-fill`
  );
}

volumeChanger.oninput = function() {
  audio.volume = parseFloat(volumeChanger.value) / 100;

  audio.volume === 1 ?
    removeSaved('volume') :
    save('volume', volumeChanger.value);


  volumeIcon.classList.replace(
    volumeIcon.className,
    audio.volume ?
      `ri-volume-${audio.volume > 0.5 ? 'up' : 'down'}-fill` :
      'ri-volume-mute-fill');
}

const savedVol = getSaved('volume');
if (savedVol) {
  volumeChanger.value = savedVol;
  audio.volume = parseFloat(volumeChanger.value) / 100;
}



if (msn) {
  navigator.mediaSession.setActionHandler('play', () => {
    audio.play();
  });
  navigator.mediaSession.setActionHandler('pause', () => {
    audio.pause();
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
  navigator.mediaSession.setActionHandler("previoustrack", () => {
    prev();
    updatePositionState();
  });
}


