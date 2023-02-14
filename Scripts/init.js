import {
  save,
  getSaved,
  params,
  image
} from './constants.js'

// fixes compatibitity with older versions

const version = 'v5.4';
document.querySelector('b b').innerText = version;
if (getSaved('version') !== version) {
  localStorage.clear();
  save('version', version);
}

// initial theme apply

if (!params.get('s')) {
  let colorSchemeQueryList = matchMedia('(prefers-color-scheme: dark)');
  //prefers color scheme
  const setColorScheme = e => {
    e.matches?
      image.src = 'Assets/dark_thumbnail.avif':
      image.src = 'Assets/default_thumbnail.avif';
  }
  setColorScheme(colorSchemeQueryList);
  colorSchemeQueryList.addListener(setColorScheme);
}

// clear thumbnail cookie

if (getSaved('thumbnail'))
  localStorage.removeItem('thumbnail')
