import {
  streamID,
  playlistID,
  themer,
  getSaved,
  save,
  input,
  query,
  audio,
  image,
  audioSRC,
  mediaSessionAPI,
  queueButton,
  loopButton
} from './constants.js'

let oldURL;
let queueCount = 0;
let queueNow = 1;
let queueList = [];
let queue = false;
let array = [];
const api = 'https://pipedapi.tokhmi.xyz';


const play = (url) => {
  let id = streamID(url);
  fetch(api + '/streams/' + id)
    .then(res => res.json())
    .then(data => {
      
      if (getSaved('thumbnail')) {
        save('thumbnail', data.thumbnailUrl);
      } else {
        image.src = data.thumbnailUrl;
        image.onload = () => themer();
      }

      // extracting opus streams
      const bitrates = [];
      const urls = [];

      for (const value of data.audioStreams) {
        if (Object.values(value).includes('opus')) {
          bitrates.push(parseInt(value.quality));
          urls.push(value.url);
        }
      }

      audioSRC(bitrates, urls);

      document.querySelector('#title').innerText = data.title;
      document.querySelector('#author').innerText = data.uploader;

      history.pushState('', '', location.origin + '/?q=' + id);
      history.replaceState('', '', location.origin + '/?q=' + id);

      mediaSessionAPI(data.title, data.uploader, data.thumbnailUrl)
    });
}


if (query != null) {
  input.value = 'https://m.youtube.com/watch?v=' + query;
  play(input.value);
}


// next track 
const next = () => {
  if ((queueCount - queueNow) > -1) {
    play(array[queueNow]);
    queueButton.setAttribute('data-badge', queueCount - queueNow);
    queueNow++;
  }
}


// link queuing algorithm

const queueIt = url => {
  queueCount++;
  queueButton.setAttribute('data-badge', queueCount - queueNow + 1);
  array[queueCount] = oldURL = url;
  audio.onended = () => {
    next();
  }
}



// queue functions and toggle

const queueNext = document.querySelector('#queueNextButton');

const queueFx = () => {
  queue = !queue;
  if (queue)
    queueCount = 0;

  queueNext.classList.toggle('hide');
  queueButton.classList.toggle('on');
  loopButton.classList.toggle('hide')
  loopButton.classList.remove('on');

}
queueButton.addEventListener('click', queueFx);

// queue Next
queueNext.addEventListener('click', next)



const validator = (inputValue) => {
  const pID = playlistID(inputValue);
  if (streamID(inputValue)) play(inputValue);

  else if (pID) {
    queueFx();
    fetch(api + '/playlists/' + pID)
      .then(res => res.json())
      .then(data => {
        for (const i of data.relatedStreams)
          queueIt('https://youtube.com' + i.url);
      });
  }
  // so that it does not run again for the same link
  oldURL = inputValue;
}

// input text player

input.addEventListener('input', () => {
  if (oldURL != input.value)
    queue ?
    queueIt(input.value) :
    validator(input.value);

});