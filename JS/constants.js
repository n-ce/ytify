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
  let x = 'https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=2592000&url=' + encodeURIComponent("https://img.youtube.com/vi_webp/" + ytID(url) + "/maxresdefault.webp");
  save('image', x);
  return x;
}
const image = document.querySelector('img');
const query = (new URL(location.href)).searchParams.get('q');



const palette = {
  'default': {
    bg: 'white',
    accent: '#fff7',
    text: '#000b',
    border: 'none'
  },
  'black': {
    bg: '#000',
    accent: '#000',
    text: '#fff',
    border: 'none'
  }
};


const colorInjector = (r, g, b) => {
  let theme = 'default';
  if (getSaved('theme'))
    theme = getSaved('theme');
  
  if (r !== g && g !== b) {

    let rgb = `rgb(${r},${g},${b}`;
    palette['default'].bg = rgb + ')';
    palette['black'].border = rgb + ')';

    document.querySelector(':root').style.setProperty('--bg', palette[theme].bg);
    document.querySelector(':root').style.setProperty('--accent', palette[theme].accent);
    document.querySelector(':root').style.setProperty('--text', palette[theme].text);
    document.querySelector(':root').style.setProperty('--border', palette[theme].border);
    document.querySelector('meta[name="theme-color"]').setAttribute("content", palette[theme].bg);
  }
}



const themer = (url) => {
  image.src = url;
  colorjs.average(
    image, {
      group: 25,
      sample: 1,
    }).then(data => {
    colorInjector(data[0], data[1], data[2]);
  });
}

if (query == null)
  save('image', 'Assets/default_thumbnail.avif');

themer(getSaved('image'));


const metadata = "https://noembed.com/embed?dataType=json&url=";


const input = document.querySelector('input');
const audio = document.querySelector('audio');

export { ytID, palette, themer, imageURL, save, getSaved, metadata, input, query, audio };