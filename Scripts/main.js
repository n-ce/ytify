import {
  $,
  setMetadata,
  streamID,
  playlistID,
  getSaved,
  save,
  api,
  params,
  audioSRC
} from './constants.js'

const input = $('input[type="url"]');
let oldURL;
let queueCount = 0;
let queueNow = 1;
let queueList = [];
let queue = false;
let array = [];
let instance = 0;

const play = (url) => {
  let id = streamID(url);
  fetch(api[instance] + 'streams/' + id)
    .then(res => res.json())
    .then(data => {

      setMetadata(
        data.thumbnailUrl,
        id,
        data.title,
        data.uploader,
        data.uploaderUrl
      );

      // extracting opus streams
      const bitrates = [];
      const urls = [];
      let bitrateOptions;

      for (const value of data.audioStreams) {
        if (Object.values(value).includes('opus')) {
          bitrates.push(parseInt(value.quality));
          urls.push(value.url);
          bitrateOptions += `<option value=${value.url}>${value.quality}</option>`;
        }
      }
      $('#bitrateSelector').innerHTML = bitrateOptions;

      audioSRC(bitrates, urls);

      history.pushState('', '', location.origin + '/?s=' + id);
      history.replaceState('', '', location.origin + '/?s=' + id);
    })
    .catch(err => {
      instance < 4 ?
        play(url) :
        alert(err);

      instance++;
    })
}



// next track 
const next = () => {
  if ((queueCount - queueNow) > -1) {
    play(array[queueNow]);
    $('#queueButton').setAttribute('data-badge', queueCount - queueNow);
    queueNow++;
  }
}


// link queuing algorithm

const queueIt = url => {
  queueCount++;
  $('#queueButton').setAttribute('data-badge', queueCount - queueNow + 1);
  array[queueCount] = oldURL = url;
  $('audio').onended = () => {
    next();
  }
}



// queue functions and toggle

const queueFx = () => {
  queue = !queue;
  if (queue)
    queueCount = 0;

  $('#qnbSpan').classList.toggle('hide');
  $('#queueButton').classList.toggle('on');
  $('#loopSpan').classList.toggle('hide')
  $('#loopButton').classList.remove('on');

}
$('#queueButton').addEventListener('click', queueFx);

// queue Next
$('#queueNextButton').addEventListener('click', next)


const playlistLoad = (id) => {
  queueFx();
  fetch(api[instance] + 'playlists/' + id)
    .then(res => res.json())
    .then(data => {
      setMetadata(
        data.thumbnailUrl,
        id,
        data.name,
        'Click on Next Button to start',
        '');
      for (const i of data.relatedStreams)
        queueIt('https://youtube.com' + i.url);
    })
    .catch(err => {
      instance < 4 ?
        playlistLoad(id) :
        alert(err);

      instance++;
    });
  history.pushState('', '', location.origin + '/?p=' + id);
  history.replaceState('', '', location.origin + '/?p=' + id);

}


const validator = (inputValue) => {
  const pID = playlistID(inputValue);
  if (streamID(inputValue)) play(inputValue);

  else if (pID) playlistLoad(pID)
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


// stream param
if (params.get('s')) {
  play('https://youtu.be/' + params.get('s'));
}
// timestamp param
if (params.get('t')) {
  $('audio').currentTime = params.get('t')
}
// playlist param
if (params.get('p')) {
  playlistLoad(params.get('p'))
}
// pwa share param
if (params.get('url')) {
  play(params.get('url'));
}
