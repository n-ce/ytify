import {
  ytID,
  themer,
  imageURL,
  getSaved,
  save,
  input,
  noembed,
  query,
  audio,
  image,
  audioSRC,
  codecs,
  mediaSessionAPI,
  queueButton,
  loopButton
} from './constants.js'

let oldURL;
let queueCount=0;
let queueNow = 1;
let queueList = [];
let queue = false;
const array = [];

const play = (url) => {
  fetch(noembed + url)
    .then(res => res.json())
    .then(data => {
      // check if link is valid
      if (data.title !== undefined) {

        if (getSaved('thumbnail')) {
          save('thumbnail', imageURL(url)); // save thumbnail url
        }
        else {
          image.src = imageURL(url); // set thumbnail
          image.onload = () => {
            // image fallback when max resolution is not available
            if (image.naturalWidth == 120)
              image.src = image.src.replace('maxres', 'hq');
            themer(); // call theme when image loaded
          }
        }
        audioSRC(data.url, 0);

        document.querySelector('#title').innerText = data.title;
        document.querySelector('#author').innerText = data.author_name;

        history.pushState('', '', location.origin + '/?q=' + ytID(url));
        history.replaceState('', '', location.origin + '/?q=' + ytID(url));

        mediaSessionAPI(data.title, data.author_name, image.src)
      }
    });
  // so that it does not run again for the same link
  oldURL = url;
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
  // queue new id
  fetch(noembed + url)
    .then(res => res.json())
    .then(da => {
      if (da.title !== undefined) {
        queueList[queueCount] = da.title;
      }
    });
  queueCount++;
  queueButton.setAttribute('data-badge', queueCount - queueNow + 1);
  array[queueCount] = oldURL = url;
  audio.onended = () => {
    next();
  }
}


// input text player

input.addEventListener('input', () => {
  if (oldURL != input.value)
    queue ?
    queueIt(input.value) :
    play(input.value);
});


// queue functions and toggle

const queueNext = document.querySelector('#queueNextButton');

queueButton.addEventListener('click', () => {
  queue = !queue;
  if (queue)
    queueCount = 0;

  queueNext.classList.toggle('hide');
  queueButton.classList.toggle('on');
  loopButton.classList.toggle('hide')
  loopButton.classList.remove('on');
});

// queue Next
queueNext.addEventListener('click', next)