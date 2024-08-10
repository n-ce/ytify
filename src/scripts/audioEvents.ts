import { audio, listAnchor, playButton, progress, queuelist } from "../lib/dom";
import { getCollection, addToCollection } from "../lib/libraryUtils";
import player from "../lib/player";
import { convertSStoHHMMSS, goTo, removeSaved, save } from "../lib/utils";
import { getSaved, params, store } from "../store";
import { appendToQueuelist, firstItemInQueue } from "./queue";


const streamHistory: string[] = [];

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

const ss = store.stream;

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



playButton.addEventListener('click', () => {
  if (!ss.id) return;
  store.player.playbackState === 'playing' ?
    audio.pause() :
    audio.play();

});


let historyID: string | undefined = '';
let historyTimeoutId = 0;


audio.addEventListener('playing', () => {
  playButton.classList.replace(playButton.className, 'ri-pause-circle-fill');
  store.player.playbackState = 'playing';
  if (!streamHistory.includes(ss.id))
    streamHistory.push(ss.id);
  const firstElementInHistory = <HTMLElement>getCollection('history').firstElementChild;
  if (getSaved('history') !== 'off' ||
    firstElementInHistory.dataset.id !== ss.id)
    historyTimeoutId = window.setTimeout(() => {
      if (historyID === ss.id) {
        addToCollection('history', store.stream);
        // just in case we are already in the history collection 
        if (listAnchor.classList.contains('view') && params.get('collection') === 'history')
          goTo('history');

      }
    }, 1e4);
});

audio.addEventListener('pause', () => {
  playButton.classList.replace('ri-pause-circle-fill', 'ri-play-circle-fill');
  store.player.playbackState = 'paused';
  clearTimeout(historyTimeoutId);
});


let isPlayable = false;
const playableCheckerID = setInterval(() => {
  if (streamHistory.length || params.has('url') || params.has('text') || !params.has('s')) {
    isPlayable = true;
    clearInterval(playableCheckerID);
  }
}, 500);


audio.addEventListener('loadeddata', () => {
  playButton.classList.replace('ri-loader-3-line', 'ri-play-circle-fill');
  if (isPlayable) audio.play();
  historyID = ss.id;
  clearTimeout(historyTimeoutId);

  // persist playback speed
  if (playSpeed.value !== '1.00')
    audio.playbackRate = parseFloat(playSpeed.value);

});


audio.addEventListener('waiting', () => {
  playButton.classList.replace(playButton.className, 'ri-loader-3-line');
});


playSpeed.addEventListener('change', () => {
  const speed = parseFloat(playSpeed.value);

  if (speed < 0 || speed > 4)
    return;

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
    appendToQueuelist(store.stream, true);
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
  volumeIcon.classList.replace(
    volumeIcon.className,
    `ri-volume-${volumeIcon.className.includes('mute') ? 'up' : 'mute'
    }-fill`
  );
});

volumeChanger.addEventListener('input', () => {
  audio.volume = parseFloat(volumeChanger.value) / 100;

  audio.volume === 1 ?
    removeSaved('volume') :
    save('volume', volumeChanger.value);


  volumeIcon.classList.replace(
    volumeIcon.className,
    audio.volume ?
      `ri-volume-${audio.volume > 0.5 ? 'up' : 'down'}-fill` :
      'ri-volume-mute-fill');
});

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


// AUTO-QUEUE

const virtualQ = new Map();
const frequencyQueue: { [index: string]: number } = {};

export function autoQueue(data: StreamItem[]) {

  const init = queuelist.querySelectorAll('div').length === 0;
  // sometimes users will remove items from queue manually, we need to account for this using the trashHistory array
  const trashHistory = sessionStorage.getItem('trashHistory');

  const initArray: DOMStringMap[] = [];

  data.forEach(stream => {

    const id = stream.url.slice(9);
    if ('type' in stream && stream.type !== 'stream')
      return;

    if (
      trashHistory?.includes(id) ||
      streamHistory.includes(id)
    ) return;

    const streamData: DOMStringMap = {
      id: id,
      title: stream.title,
      author: stream.uploaderName,
      duration: convertSStoHHMMSS(stream.duration),
    };

    if (virtualQ.has(id))
      frequencyQueue[id]++;
    else {
      virtualQ.set(id, streamData);
      frequencyQueue[id] = 1;
    }

    initArray.push(streamData);


  });

  // if queue empty all recommended streams are pushed to queue else they are pushed it to a virtual queue
  init ?
    initArray.forEach(s => {
      appendToQueuelist(s);
    }) :
    Object.entries(frequencyQueue)
      .sort((a, b) => b[1] - a[1])
      .filter((v, _, a) => v[1] === a[0][1])
      .forEach(v => {
        appendToQueuelist(virtualQ.get(v[0]));
      });

}
