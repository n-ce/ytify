import {
  $,
  setMetadata,
  streamID,
  playlistID,
  getSaved,
  save,
  api,
  params
} from './constants.js'

const input = $('input[type="url"]');
let oldURL;
let queueCount = 0;
let queueNow = 1;
// let queueList = [];
let queue = false;
let array = [];
let instance = 0;

const play = (id) => {
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

      if (data.audioStreams.length === 0) {
        alert('NO AUDIO STREAMS AVAILABLE.');
        return;
      }
      // extracting opus streams and storing m4a streams
      let bitrates = [];
      let urls = [];
      const m4aBitrates = [];
      const m4aUrls = [];
      let m4aOptions = '';

      for (const value of data.audioStreams) {
        if (Object.values(value).includes('opus')) {
          bitrates.push(parseInt(value.quality));
          urls.push(value.url);
          $('#bitrateSelector').innerHTML += `<option value=${value.url}>${value.quality}</option>`;
        } else {
          m4aBitrates.push(parseInt(value.quality));
          m4aUrls.push(value.url);
          m4aOptions += `<option value=${value.url}>${value.quality}</option>`;
        }
      }

      // finding lowest available stream when low opus bitrate unavailable
      if (!getSaved('quality') && Math.min(...bitrates) > 64) {
        $('bitrateSelector').innerHTML += m4aOptions;
        bitrates = bitrates.concat(m4aBitrates);
        urls = urls.concat(m4aUrls)
      }

      let index = 0;
      getSaved('quality') ?
        index = bitrates.indexOf(Math.max(...bitrates)) :
        index = bitrates.indexOf(Math.min(...bitrates));

      $('audio').src = urls[index];

      $('#bitrateSelector').selectedIndex = index;

      $('#playButton').classList.replace($('#playButton').classList[0], 'spinner');
      
      params.set('s', id);
      history.pushState({}, '', '?' + params);
    })
    .catch(err => {
      instance < api.length - 1 ?
        play(id) :
        alert(err);
      instance++;
    })
}



// next track 
const next = () => {
  if ((queueCount - queueNow) > -1) {
    play(array[queueNow]);
    $('#queueButton i').setAttribute('data-badge', queueCount - queueNow);
    queueNow++;
  }
}


// link queuing algorithm

const queueIt = id => {
  queueCount++;
  $('#queueButton i').setAttribute('data-badge', queueCount - queueNow + 1);
  array[queueCount] = oldURL = id;
  $('audio').onended = () => { next() };
}



// queue functions and toggle

const queueFx = () => {
  queue = !queue;
  if (queue) queueCount = 0;

  $('#queueNextButton').classList.toggle('hide');
  $('#queueButton i').classList.toggle('on');
  $('#loopButton').classList.toggle('hide')
  $('#loopButton i').classList.remove('on');
}
$('#queueButton').addEventListener('click', queueFx);

$('#queueNextButton').addEventListener('click', next)


const playlistLoad = (id) => {
  fetch(api[instance] + 'playlists/' + id)
    .then(res => res.json())
    .then(data => {
      queueFx();
      setMetadata(
        data.thumbnailUrl,
        id,
        data.name,
        'Click on Next Button to start',
        '');
      for (const i of data.relatedStreams)
        queueIt(i.url.slice(9))
    })
    .catch(err => {
      instance < api.length - 1 ?
        playlistLoad(id) :
        alert(err);
      instance++;
    });
  params.set('p', id);
  history.pushState({}, '', '?' + params);

}


const validator = (val) => {
  const pID = playlistID(val);
  const sID = streamID(val);

  if (sID)
    queue ? queueIt(sID) : play(sID);
  else if (pID)
    queue ? queueIt(pID) : playlistLoad(pID);

  // so that it does not run again for the same link
  oldURL = val;
}

// input text player

input.addEventListener('input', () => {
  if (oldURL != input.value)
    validator(input.value);
});


// URL params 

if (params.get('s')) // stream
  validator('https://youtube.com/watch?v=' + params.get('s'));

if (params.get('p')) // playlist
  validator('https://youtube.com/playlist?list=' + params.get('p'))

if (params.get('t')) // timestamp
  $('audio').currentTime = params.get('t');

if (params.get('url')) // PWA
  validator(params.get('url'))
else if (params.get('text')) {
  validator(params.get('text'));
  $('audio').play();
}