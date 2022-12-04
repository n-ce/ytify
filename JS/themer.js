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

const colorChanger =
  (variable, colour) => {
    document
      .querySelector(':root')
      .style
      .setProperty(variable, colour);
  }


const themer = (url) => {
  colorjs
    .average(
      url, {
        group: 25,
        sample: 1,
      })
    .then(colors => {
      let [r, g, b] = colors;

      document.querySelector('img').src = url;

      // thumbnail color injected into palette
      if (r !== g && g !== b) {
        palette['default'].bg = `rgb(${r},${g},${b})`;
        palette['dark'].accent = `rgba(${r},${g},${b}, 0.3)`;
        palette['black'].border = `rgba(${r},${g},${b}, 0.6)`;
      }
      colorChanger('--bg', palette[theme].bg);
      colorChanger('--accent', palette[theme].accent);
      colorChanger('--text', palette[theme].text);
      colorChanger('--border', palette[theme].border);
    });
}

let theme = 'default';

const savedTheme = localStorage.getItem('theme');

if (savedTheme) {
  theme = savedTheme;
  themer(`Assets/${theme}_thumbnail.avif`);
}


document.getElementById('themeButton').addEventListener('click', () => {
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
  themer(`Assets/${theme}_thumbnail.avif`);

});