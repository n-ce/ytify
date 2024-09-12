import { audio, listAnchor, playButton, progress, queuelist } from "../lib/dom";
import player from "../lib/player";
import { convertSStoHHMMSS, goTo, removeSaved, save } from "../lib/utils";
import { getSaved, params, store } from "../lib/store";
import { appendToQueuelist, firstItemInQueue } from "./queue";
import { addToCollection, getCollection } from "../lib/libraryUtils";
import { getData } from "../modules/getStreamData";


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
  if (msn)
    if ('setPositionState' in navigator.mediaSession)
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate,
        position: audio.currentTime,
      });
}



playButton.onclick = function() {
  if (!store.stream.id) return;
  store.player.playbackState === 'playing' ?
    audio.pause() :
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


audio.onloadeddata = function() {
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

  progress.value = seconds.toString();
  currentDuration.textContent = convertSStoHHMMSS(seconds);

}


audio.onloadedmetadata = function() {
  progress.value = '0';
  progress.min = '0';
  progress.max = Math.floor(audio.duration).toString();
  fullDuration.textContent = convertSStoHHMMSS(audio.duration);
}


audio.oncanplaythrough = async function() {
  const nextItem = store.queue[0];
  const pf = store.player.prefetch;
  if (audio.duration - audio.currentTime < 30)
    if (!(nextItem in pf))
      pf[nextItem] = await getData(nextItem);
}

audio.onerror = async function() {
  const ivProxy = new URL(audio.src).origin;
  const piProxy = new URL(store.player.prefetch[store.stream.id].hls).origin;
  if (
    !store.player.HLS &&
    piProxy !== ivProxy
  )
    audio.src = audio.src.replace(ivProxy, piProxy);
}


loopButton.onclick = function() {
  loopButton.classList.toggle('on');
  audio.loop = !audio.loop;
}



playPrevButton.onclick = function() {
  if (store.streamHistory.length > 1) {
    appendToQueuelist(store.stream, true);
    store.streamHistory.pop();
    player(store.streamHistory[store.streamHistory.length - 1]);
  }
}



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
}


