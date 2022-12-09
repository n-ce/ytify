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


const palette = {
  'default': {
    bg: 'rgb(119, 149, 218)',
    accent: '#fff7',
    text: '#000b',
    border: 'none'
  },
  'dark': {
    bg: '#1f1f1f',
    accent: '#0004',
    text: '#fffe',
    border: '#fff2'
  },
  'black': {
    bg: '#000',
    accent: '#000',
    text: '#fff',
    border: '#fff4'
  }
};


const themer = (url, theme) => {
  document.querySelector('img').src = url;

  colorjs.average(
    url, {
      group: 25,
      sample: 1,
    }).then(colors => {
    let [r, g, b] = colors;
    // thumbnail color injected into palette
    if (r !== g && g !== b) {
      palette['default'].bg = `rgb(${r},${g},${b})`;
      palette['dark'].accent = `rgba(${r},${g},${b}, 0.3)`;
      palette['black'].border = `rgba(${r},${g},${b}, 0.6)`;
    }
    document.querySelector(':root').style.setProperty('--bg', palette[theme].bg);
    document.querySelector(':root').style.setProperty('--accent', palette[theme].accent);
    document.querySelector(':root').style.setProperty('--text', palette[theme].text);
    document.querySelector(':root').style.setProperty('--border', palette[theme].border);
    document.querySelector('meta[name="theme-color"]').setAttribute("content", palette[theme].bg);
    save('theme', theme);

  });
}
const metadata = "https://noembed.com/embed?dataType=json&url=";
const codecs = {
  'low': [600, 139, 249],
  'high': [251, 140]
}

const input = document.querySelector('input');
const query = (new URL(location.href)).searchParams.get('q');
const audio = document.querySelector('audio');

export { ytID, palette, themer, imageURL, save, getSaved, metadata, codecs, input, query,audio };
