import Hls from "hls.js";
import { audio, playButton, progress, queuelist } from "../lib/dom";
import { getCollection, addToCollection } from "../lib/libraryUtils";
import player from "../lib/player";
import { convertSStoHHMMSS, params, getSaved, idFromURL } from "../lib/utils";
import { appendToQueuelist, firstItemInQueue } from "./queue";



const streamHistory: string[] = [];
const ad = audio.dataset as { [index: string]: string };

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



playButton.addEventListener('click', () => {
  if (!ad.id) return;
  ad.playbackState === 'playing' ?
    audio.pause() :
    audio.play();
});


let historyID: string | undefined = '';
let historyTimeoutId = 0;


audio.addEventListener('playing', () => {
  playButton.classList.replace(playButton.className, 'ri-pause-circle-fill');
  ad.playbackState = 'playing';
  if (!streamHistory.includes(ad.id))
    streamHistory.push(ad.id);
  const firstElementInHistory = <HTMLElement>getCollection('history').firstElementChild;
  if (getSaved('history') !== 'off' ||
    firstElementInHistory.dataset.id !== ad.id)
    historyTimeoutId = window.setTimeout(() => {
      if (historyID === ad.id) {
        addToCollection('history', ad);
        // just in case we are already in the history collection 
        if (params.get('collection') === 'history')
          document.getElementById('history')!.click();

      }
    }, 1e4);
});

audio.addEventListener('pause', () => {
  playButton.classList.replace('ri-pause-circle-fill', 'ri-play-circle-fill');
  ad.playbackState = 'paused';
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
  historyID = ad.id;
  clearTimeout(historyTimeoutId);

  // persist playback speed
  if (playSpeed.value !== '1.00')
    audio.playbackRate = parseFloat(playSpeed.value);

});


audio.addEventListener('waiting', () => {
  playButton.classList.replace(playButton.className, 'ri-loader-3-line');
  clearTimeout(historyTimeoutId);
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

const hls = new Hls();

hls.attachMedia(audio);
hls.on(Hls.Events.MANIFEST_PARSED, () => {
  audio.play();
});
export { hls };

loopButton.addEventListener('click', () => {
  loopButton.classList.toggle('on');
  audio.loop = !audio.loop;
});



playPrevButton.addEventListener('click', () => {
  if (streamHistory.length > 1) {
    appendToQueuelist(ad, true);
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
  volumeIcon.classList.replace(
    volumeIcon.className,
    audio.volume ?
      `ri-volume-${audio.volume > 0.5 ? 'up' : 'down'}-fill` :
      'ri-volume-mute-fill');
});



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


player(params.get('s') || idFromURL(params.get('url') || params.get('text')));



/*
Understanding AutoQueue

first stream loads, emits a bunch of recommended streams, all pushed to queue
second stream loads, emits a bunch of recommended streams, all pushed it to a virtual queue
third stream loads, continue pushing to virtual queue
and so on till the last stream in the original queue
where we analyse all the items in the virtual queue by frequency of appearance

sometimes users will remove items from queue manually, we need to account for this using the trashHistory array

we filter out the trashHistory from the virtualqueue and push only the most recurring streams into the original queue

*/


const virtualQ = new Map();
const frequencyQueue: { [index: string]: number } = {};

export function autoQueue(data: Recommendation[]) {

  const init = queuelist.querySelectorAll('div').length === 0;
  const trashHistory = sessionStorage.getItem('trashHistory');

  data.forEach(stream => {

    const id = stream.videoId || stream.url.slice(9);
    const author = stream.author || stream.uploaderName;
    const duration = stream.lengthSeconds || stream.duration;

    if ('type' in stream && stream.type !== 'stream')
      return;

    if (
      trashHistory?.includes(id) ||
      streamHistory.includes(id)
    ) return;

    const streamData = {
      id: id,
      title: stream.title,
      author: author,
      duration: convertSStoHHMMSS(duration),
    };

    if (virtualQ.has(id))
      frequencyQueue[id]++;
    else {
      virtualQ.set(id, streamData);
      frequencyQueue[id] = 1;
    }


    if (init) {
      const data = streamData;

      appendToQueuelist(data);
    }

  });

  const freqArr = Object.entries(frequencyQueue).sort((a, b) => b[1] - a[1]);

  const sortedObj = Object.fromEntries(freqArr);

  console.log(sortedObj);


}
