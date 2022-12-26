// Elements

const image = document.querySelector('img');
const audio = document.querySelector('audio');
const input = document.querySelector('input[type="url"]');
const progress = document.querySelector('input[type="range"]');
const settingsButton = document.querySelector('#settingsButton')
const queueButton = document.querySelector('#queueButton');
const loopButton = document.querySelector('#loopButton');
const bitrate = document.querySelector('#bitrate');

// Values

const codecs = {
  'low': [600, 139, 249],
  'high': [251, 140]
}
const bitrates = {
  'low': ['30kbps Opus', '30kbps M4A', '50kbps Opus'],
  'high': ['128kbps Opus', '128kbps M4A']
}


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

const noembed = "https://noembed.com/embed?dataType=json&url=";
const proxy = 'https://corsproxy.io/?';
const provider = 'https://xtcyg6.deta.dev/';
const query = (new URL(location.href)).searchParams.get('q');

// Reusable Functions

const save = (key, pair) => {
  localStorage.setItem(key, pair);
}
const getSaved = (key) => {
  return localStorage.getItem(key);
}
const ytID = (val) => {
  return val.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i)[7];
}
const imageURL = (url) => {
  return 'https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=2592000&url=' + encodeURIComponent("https://img.youtube.com/vi_webp/" + ytID(url) + "/maxresdefault.webp");
}

let quality;
let played = false; // so audio.play() does not execute at startup when query is provided

const error = () => {
  image.src = 'Assets/error_thumbnail.avif';
  alert('Error!\nThis can happen due to multiple reasons :\n\n1. Stream requires authorisation.\n2. Proxy failure.\n3. Backend offline.')
  audio.onerror = null;
  document.querySelector("#playerControls").style.display = 'none';
}

const audioSRC = (url, codec) => {
  getSaved('quality') ?
    quality = 'high' :
    quality = 'low';

  fetch(proxy + encodeURIComponent(provider + ytID(url) + '/' + codecs[quality][codec]))
    .then(res => res.text())
    .then(data => audio.src = data)

  bitrate.innerText = bitrates[quality][codec];

  audio.onerror = () => {
    if (codec == 0) {
      audioSRC(url, 1)
    } else if (codec == 1) {
      quality == 'low' ? audioSRC(url, 2) : error();
    } else {
      error()
    }
  }

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

export {
  image,
  audio,
  input,
  progress,
  settingsButton,
  queueButton,
  loopButton,
  codecs,
  palette,
  noembed,
  query,
  save,
  getSaved,
  ytID,
  imageURL,
  audioSRC,
  colorIt,
  themer,
  mediaSessionAPI
}