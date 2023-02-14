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
    bg: 'white',
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


let played = false; // so audio.play() does not execute at startup when query is provided

const audioSRC = (bitrates, urls) => {
  let DBR;

  getSaved('quality') ?
    DBR = Math.max(...bitrates) :
    DBR = Math.min(...bitrates);

  audio.src = urls[bitrates.indexOf(DBR)];
  bitrateInfo.innerText = DBR + ' kbps Opus';

  if (!params.get('s') || played)
    audio.play();

  document.querySelector("#playerControls").style.display = 'flex';

  played = true;
}

const colorIt = (a, b, c, d) => {
  document.querySelector(':root').style.setProperty('--bg', a);
  document.querySelector(':root').style.setProperty('--accent', b);
  document.querySelector(':root').style.setProperty('--text', c);
  document.querySelector(':root').style.setProperty('--border', d);
  document.querySelector('meta[name="theme-color"]').setAttribute("content", a);
}

let theme;

const themer = () => {
  colorjs.average(
    image, {
      group: 25,
      sample: 1
    }).then(c => {

    getSaved('theme') ?
      theme = 'dark' :
      theme = 'light';

    if ((c[0] + c[1] + c[2]) < 85)
      c[0] += 34, c[1] += 34, c[2] += 34;

    palette['light'].bg = palette['dark'].border = `rgb(${c[0]},${c[1]},${c[2]})`;

    colorIt(
      palette[theme].bg,
      palette[theme].accent,
      palette[theme].text,
      palette[theme].border)

  });
}

const setMetadata = (thumbnail, id, title, author,authorUrl) => {
  if (getSaved('thumbnail')) {
    save('thumbnail', thumbnail);
  } else {
    image.src = thumbnail;
    image.onload = () => themer();
  }
  document.getElementById('title').innerHTML = `<a href="https://youtu.be/${id}">${title}</a>`;
  document.getElementById('author').innerHTML = `<a href="https://youtube.com${authorUrl}">${author}</a>`;
  
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

const convertSStoMMSS = (seconds) => {
  let mm = Math.floor(seconds / 60);
  let ss = Math.floor(seconds % 60);
  if (mm < 10) mm = `0${mm}`;
  if (ss < 10) ss = `0${ss}`;
  return `${mm}:${ss}`
}

export {
  image,
  audio,
  input,
  progress,
  settingsButton,
  queueButton,
  loopButton,
  palette,
  api,
  params,
  save,
  getSaved,
  streamID,
  playlistID,
  audioSRC,
  colorIt,
  themer,
  setMetadata,
  convertSStoMMSS
}