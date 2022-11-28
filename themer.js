const palette = {
  'default': {
    bg: null,
    accent: '#fff7',
    text: '#000b',
    border: 'none',

  },
  'dark': {
    bg: '#1f1f1f',
    accent: null,
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

const colorChanger = (variable, colour) => {
  document.querySelector(':root').style.setProperty(variable, colour);
}


const fx = (url) => {
  colorjs.average(url, { group: 25, sample: 1, }).then(colors => {
    let [r, g, b] = colors;
    document.querySelector('img').src = url;
    // thumbnail color injected into palette
    palette['default'].bg = `rgb(${r},${g},${b})`;
    palette['dark'].accent = `rgba(${r},${g},${b}, 0.3)`;

    colorChanger('--bg', palette[theme].bg);
    colorChanger('--accent', palette[theme].accent);
    colorChanger('--text', palette[theme].text);
    colorChanger('--border', palette[theme].border);
  });
}

let theme;

const savedTheme = localStorage.getItem('theme');

if (savedTheme) {
  theme = savedTheme;
  fx(`Assets/${theme}_thumbnail.avif`);
}
else { theme = 'default'; }

document.getElementById('theme').addEventListener('click', () => {
  if (theme == 'default') {
    theme = 'dark';
    localStorage.setItem('theme', theme);
  }
  else if (theme == 'dark') {
    theme = 'black';
    localStorage.setItem('theme', theme);
  }
  else if (theme == 'black') {
    theme = 'default';
    localStorage.clear();
  }
  fx(`Assets/${theme}_thumbnail.avif`);

});

document.getElementById('stngBtn').addEventListener('click', ()=>{
  document.querySelector('#settings').classList.toggle('show');
})
