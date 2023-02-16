// Elements

const image = document.querySelector('img');
const audio = document.querySelector('audio');
const input = document.querySelector('input[type="url"]');
const progress = document.querySelector('input[type="range"]');
const settingsButton = document.querySelector('#settingsButton')
const queueButton = document.querySelector('#queueButton');
const loopButton = document.querySelector('#loopButton');
const bitrateInfo = document.querySelector('#bitrate');

// Values

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
const getSaved = (key) => {
  return localStorage.getItem(key);
}

const streamID = (url) => {
  const match = url.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i);
  if (match !== null) return match[7];
}
const playlistID = (url) => {
  const match = url.match(/[&?]list=([^&]+)/i)
  if (match !== null) return match[1];
}



const audioSRC = (bitrates, urls) => {
  let DBR;

  getSaved('quality') ?
    DBR = Math.max(...bitrates) :
    DBR = Math.min(...bitrates);

  audio.src = urls[bitrates.indexOf(DBR)];
  bitrateInfo.innerText = DBR + ' kbps Opus';

  if (!params.get('s')) audio.play();

  document.querySelector("#playerControls").style.display = 'flex';
  
}



let theme;

const themer = () => {

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.width = image.width;
  canvas.height = image.height;
  context.drawImage(image, 0, 0, 1, 1);

  const c = context.getImageData(0, 0, 1, 1).data;

  getSaved('theme') ?
    theme = 'dark' :
    theme = 'light';

  if ((c[0] + c[1] + c[2]) < 85)
    c[0] += 34, c[1] += 34, c[2] += 34;

  palette['light'].bg = palette['dark'].border = `rgb(${c[0]},${c[1]},${c[2]})`;

  document.querySelector(':root').style.setProperty('--bg', palette[theme].bg);
  document.querySelector(':root').style.setProperty('--accent', palette[theme].accent);
  document.querySelector(':root').style.setProperty('--text', palette[theme].text);
  document.querySelector(':root').style.setProperty('--border', palette[theme].border);
  document.querySelector('meta[name="theme-color"]').setAttribute("content", palette[theme].bg);
}

image.addEventListener('load', themer);


const setMetadata = (thumbnail, id, title, author, authorUrl) => {
  if (getSaved('thumbnail')) {
    save('thumbnail', thumbnail);
  } else {
    image.src = thumbnail;
  }

  const titleElem = document.getElementById('title');
  const authorElem = document.getElementById('author');

  titleElem.href = `https://youtu.be/${id}`;
  titleElem.innerText = title;
  authorElem.href = `https://youtube.com${authorUrl}`;
  authorElem.innerText = author;

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
  image,
  audio,
  input,
  progress,
  settingsButton,
  queueButton,
  loopButton,
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