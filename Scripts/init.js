import {
  save,
  getSaved,
  params,
  image
} from './constants.js'

// fixes compatibitity with older versions

const version = 'v5.5';
document.querySelector('footer p').innerText = version;
if (getSaved('version') !== version) {
  localStorage.clear();
  save('version', version);
}

// initial theme apply

if (!params.get('s')) image.src = 'Assets/default_thumbnail.avif';

// clear thumbnail cookie

if (getSaved('thumbnail'))
  localStorage.removeItem('thumbnail')
