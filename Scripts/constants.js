// Variables

const $ = document.querySelector.bind(document);

const palette = {
  'light': {
    bg: 'none',
    accent: '#fff5',
    text: '#000b',
    border: '#000b'
  },
  'dark': {
    bg: '#000',
    accent: '#000',
    text: '#fff',
    border: 'none'
  }
};

const api = [
  'https://pipedapi.kavin.rocks/',
  'https://pipedapi-libre.kavin.rocks/',
  'https://pipedapi.tokhmi.xyz/',
  'https://api-piped.mha.fi/',
  'https://pipedapi.moomoo.me/'
  ];

const params = (new URL(document.location)).searchParams;

// Reusable Functions

const save = (key, pair) => {
  localStorage.setItem(key, pair);
}
const getSaved = (key) => localStorage.getItem(key);


if (getSaved('thumbnail')) localStorage.removeItem('thumbnail')

const streamID = (url) => {
  const match = url.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i);
  if (match !== null) return match[7];
}
const playlistID = (url) => {
  const match = url.match(/[&?]list=([^&]+)/i)
  if (match !== null) return match[1];
}

let userInteracted = false;
if (!params.get('s')) userInteracted = true;

const audioSRC = (bitrates, urls) => {
  let DBR;

  getSaved('quality') ?
    DBR = Math.max(...bitrates) :
    DBR = Math.min(...bitrates);

  const index = bitrates.indexOf(DBR);
  $('audio').src = urls[index];
  $('#bitrateSelector').selectedIndex = index;
  $('#playButton').classList.add('on');
  if (userInteracted) $('audio').play();
}

$('#bitrateSelector').addEventListener('change', () => {
  const ct = $('audio').currentTime;
  $('audio').src = $('#bitrateSelector').value;
  $('audio').currentTime = ct;
  $('audio').play();
});


let theme;

const themer = () => {

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.width = $('img').width;
  canvas.height = $('img').height;
  context.drawImage($('img'), 0, 0, 1, 1);

  const c = context.getImageData(0, 0, 1, 1).data;

  getSaved('theme') ?
    theme = 'dark' :
    theme = 'light';

  const ct = c[0] + c[1] + c[2];
  if (ct < 100)
    c[0] += 34,
    c[1] += 34,
    c[2] += 34;

  palette['light'].bg = palette['dark'].border = `rgb(${c[0]},${c[1]},${c[2]})`;

  $(':root').style.setProperty('--bg', palette[theme].bg);
  $(':root').style.setProperty('--accent', palette[theme].accent);
  $(':root').style.setProperty('--text', palette[theme].text);
  $(':root').style.setProperty('--border', palette[theme].border);
  $('meta[name="theme-color"]').setAttribute("content", palette[theme].bg);

}

$('img').addEventListener('load', themer);

if (!params.get('s') && !params.get('text'))
  $('img').src = 'Assets/default_thumbnail.avif'


const setMetadata = (thumbnail, id, title, author, authorUrl) => {

  getSaved('thumbnail') ?
    save('thumbnail', thumbnail) :
    $('img').src = thumbnail;

  $('#title').href = `https://youtu.be/${id}`;
  $('#title').innerText = title;
  $('#author').href = `https://youtube.com${authorUrl}`;
  $('#author').innerText = author;

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title,
      artist: author,
      artwork: [
        { src: thumbnail, sizes: '96x96' },
        { src: thumbnail, sizes: '128x128' },
        { src: thumbnail, sizes: '192x192' },
        { src: thumbnail, sizes: '256x256' },
        { src: thumbnail, sizes: '384x384' },
        { src: thumbnail, sizes: '512x512' },
              ]
    })
  }

}

const convertSStoMMSS = (seconds) => {
  let mm = Math.floor(seconds / 60);
  let ss = Math.floor(seconds % 60);
  if (mm < 10) mm = `0${mm}`;
  if (ss < 10) ss = `0${ss}`;
  return `${mm}:${ss}`;
}

export {
  $,
  api,
  params,
  save,
  getSaved,
  streamID,
  playlistID,
  audioSRC,
  themer,
  setMetadata,
  convertSStoMMSS
}