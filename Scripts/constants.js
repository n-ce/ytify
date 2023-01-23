// Elements

const image = document.querySelector('img');
const audio = document.querySelector('audio');
const input = document.querySelector('input[type="url"]');
const progress = document.querySelector('input[type="range"]');
const settingsButton = document.querySelector('#settingsButton')
const queueButton = document.querySelector('#queueButton');
const loopButton = document.querySelector('#loopButton');
const bitrates = document.querySelector('#bitrate');

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

const query = (new URL(location.href)).searchParams.get('q');

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
  const match= url.match(/[&?]list=([^&]+)/i)
  if (match !== null) return match[1];
}


let quality;
let played = false; // so audio.play() does not execute at startup when query is provided


const audioSRC = (streams) => {
  getSaved('quality') ?
    quality = 'high' :
    quality = 'low';

  let lowest = streams[0].bitrate;

  for (const value of streams) {
    if (value.bitrate <= lowest) {
      lowest = value.bitrate;
      audio.src = value.url;
    }
  }
  bitrates.innerText = lowest + 'kbps opus';

  if (!query || played)
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

const mediaSessionAPI = (name, author, image) => {
  navigator.mediaSession.metadata = new MediaMetadata({
    title: name,
    artist: author,
    artwork: [
      { src: image, sizes: '96x96', type: 'image/webp' },
      { src: image, sizes: '128x128', type: 'image/webp' },
      { src: image, sizes: '192x192', type: 'image/webp' },
      { src: image, sizes: '256x256', type: 'image/webp' },
      { src: image, sizes: '384x384', type: 'image/webp' },
      { src: image, sizes: '512x512', type: 'image/webp' },
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
  query,
  save,
  getSaved,
  streamID,
  playlistID,
  audioSRC,
  colorIt,
  themer,
  mediaSessionAPI,
  convertSStoMMSS
}