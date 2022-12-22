import {
  save,
  getSaved,
  query,
  image,
  themer,
  input
} from './constants.js'

// fixes compatibitity with older versions

const version = 'v5.RC1';
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
    e.matches ?
      image.src = 'https://raw.githubusercontent.com/n-ce/ytify/82a026749e22b599c9e567cf55b51f446ecaf6eb/Assets/dark_thumbnail.avif' :
      image.src = 'Assets/default_thumbnail.avif';
    themer();
  }
  setColorScheme(colorSchemeQueryList);
  colorSchemeQueryList.addListener(setColorScheme);
}

// clear thumbnail cookie

if (getSaved('thumbnail'))
  localStorage.removeItem('thumbnail')