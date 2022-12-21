// Elements

const image = document.querySelector('img');
const audio = document.querySelector('audio');
const input = document.querySelector('input[type="url"]');
const progress = document.querySelector('input[type="range"]');
const settingsButton = document.querySelector('#settingsButton')
const queueButton = document.querySelector('#queueButton');
const loopButton = document.querySelector('#loopButton');

// Values

const codecs = {
  'low': [600, 139, 249],
  'high': [251, 140]
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


const proxy = 'https://corsproxy.io/?';
const provider = 'https://alertreduser.animeshnath.repl.co/';

const audioSRC = (url, codec) => {
  getSaved('quality') ?
    quality = 'high' :
    quality = 'low';
  fetch(proxy + encodeURIComponent(`${provider}?url=${url}&format=${codecs[quality][codec]}`))
    .then(res => res.text())
    .then(data => {
      audio.src = data;
    })
  if (!query || played)
    audio.play();
  document.querySelector("#playerControls").style.display='flex';
 
  played = true;
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

    document.querySelector(':root').style.setProperty('--bg', palette[theme].bg);
    document.querySelector(':root').style.setProperty('--accent', palette[theme].accent);
    document.querySelector(':root').style.setProperty('--text', palette[theme].text);
    document.querySelector(':root').style.setProperty('--border', palette[theme].border);
    document.querySelector('meta[name="theme-color"]').setAttribute("content", palette[theme].bg);

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
  themer,
  mediaSessionAPI
}