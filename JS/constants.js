const save = (key, pair) => {
  localStorage.setItem(key, pair);
}
const getSaved = (key) => {
  return localStorage.getItem(key);
}

const ytID = (val) => {
  return val.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i)[7];
}

const image = document.querySelector('img');


const imageURL = (url) => {
  return 'https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=2592000&url=' + encodeURIComponent("https://img.youtube.com/vi_webp/" + ytID(url) + "/maxresdefault.webp");
}

const query = (new URL(location.href)).searchParams.get('q');


const palette = {
  'light': {
    bg: 'white',
    accent: '#fff7',
    text: '#000b',
    border: 'none'
  },
  'dark': {
    bg: '#000',
    accent: '#000',
    text: '#fff',
    border: 'none'
  }
};

let theme;

const colorInjector = (r, g, b) => {

  getSaved('theme') ?
    theme = 'dark' :
    theme = 'light';

  if (r !== g && g !== b) {

    palette['light'].bg =
      palette['dark'].border =
      `rgb(${r},${g},${b})`;

    document.querySelector(':root').style.setProperty('--bg', palette[theme].bg);
    document.querySelector(':root').style.setProperty('--accent', palette[theme].accent);
    document.querySelector(':root').style.setProperty('--text', palette[theme].text);
    document.querySelector(':root').style.setProperty('--border', palette[theme].border);
    document.querySelector('meta[name="theme-color"]').setAttribute("content", palette[theme].bg);
  }
}

const themer = () => {
  colorjs.average(
    image, {
      group: 25,
      sample: 1,
    }).then(data => {
    colorInjector(data[0], data[1], data[2]);
  });
}

if (query == null) {
  image.src = 'Assets/default_thumbnail.avif';
  themer();
}

const metadata = "https://noembed.com/embed?dataType=json&url=";


const input = document.querySelector('input');
const audio = document.querySelector('audio');

export { ytID, palette, themer, imageURL, save, getSaved, metadata, input, query, audio, image };