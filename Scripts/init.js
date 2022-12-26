import {
  save,
  getSaved,
  query,
  image,
  colorIt,
  input
} from './constants.js'

// fixes compatibitity with older versions

const version = 'v5.RC2';
document.querySelector('kbd').innerText = version;
if (getSaved('version') !== version) {
  localStorage.clear();
  save('version', version);
}

// initial theme apply

if (query == null) {
  let colorSchemeQueryList = window.matchMedia('(prefers-color-scheme: dark)');
  //prefers color scheme
  const setColorScheme = e => {
    if (e.matches) {
      colorIt('black', '#fff1', 'white', '#fff7')
      image.src = 'Assets/dark_thumbnail.avif';
    } else {
      image.src = 'Assets/default_thumbnail.avif';
      getSaved('theme') ?
        colorIt('#000', '#000', '#fff', 'rgb(119,149,218)') :
        colorIt('rgb(119,149,218)', '#fff5', '#000b', '#000b');
    }
  }
  setColorScheme(colorSchemeQueryList);
  colorSchemeQueryList.addListener(setColorScheme);
}

// clear thumbnail cookie

if (getSaved('thumbnail'))
  localStorage.removeItem('thumbnail')