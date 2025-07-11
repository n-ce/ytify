import { audio, playButton, progress, queuelist, title } from "../lib/dom";
import player from "../lib/player";
import { convertSStoHHMMSS } from "../lib/utils";
import { params, setState, state, store } from "../lib/store";
import { addToCollection } from "../lib/libraryUtils";
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

  if (!state.history)
    return;

  historyTimeoutId = window.setTimeout(() => {
    if (historyID === id)
      addToCollection('history', store.stream, 'addNew');
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


audio.oncanplaythrough = async function() {
  // prefetch beforehand to speed up experience
  const nextItem = state.prefetch && store.queue.list[0];
  if (!nextItem) return;

  const data = await getStreamData(nextItem, true);
  const sandbox = new Audio();
  sandbox.onerror = () => audioErrorHandler(sandbox);
  if ('audioStreams' in data)
    import('../modules/setAudioStreams')
      .then(mod => mod.default(
        data.audioStreams
          .sort((a: { bitrate: string }, b: { bitrate: string }) => (parseInt(a.bitrate) - parseInt(b.bitrate))
          ),
        data.livestream,
        sandbox
      ));
}

audio.onerror = () => audioErrorHandler(audio);


loopButton.onclick = function() {
  loopButton.classList.toggle('on');
  audio.loop = !audio.loop;
}


function prev() {
  if (store.streamHistory.length > 1) {
    store.queue.append(store.stream, true);
    store.streamHistory.pop();
    player(store.streamHistory[store.streamHistory.length - 1]);
  }
}

playPrevButton.onclick = prev;


function onEnd() {
  playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
  if (queuelist.childElementCount)
    store.queue.firstChild()?.click();
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

  setState('volume', volumeChanger.value);

  volumeIcon.classList.replace(
    volumeIcon.className,
    audio.volume ?
      `ri-volume-${audio.volume > 0.5 ? 'up' : 'down'}-fill` :
      'ri-volume-mute-fill');
}

const { volume } = state;
if (volume) {
  volumeChanger.value = volume;
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


