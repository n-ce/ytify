import averageColor from './color.average.esm.min.js';

// Variables

const $ = document.getElementById.bind(document);

const palette = {
	'light': {
		bg: 'none',
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


const api = [
  'https://pipedapi.kavin.rocks/',
  'https://watchapi.whatever.social',
  'https://pipedapi.tokhmi.xyz/',
  'https://pipedapi.syncpundit.io/',
  'https://piped-api.garudalinux.org',
  'https://pipedapi.moomoo.me/'
  ];


const params = (new URL(document.location)).searchParams;

// Reusable Functions

const save = (key, pair) => {
	localStorage.setItem(key, pair);
}
const getSaved = (key) => localStorage.getItem(key);


if (getSaved('thumbnail')) localStorage.removeItem('thumbnail');

const streamID = (url) => {
	const match = url.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i);
	if (match !== null) return match[7];
}
const playlistID = (url) => {
	const match = url.match(/[&?]list=([^&]+)/i);
	if (match !== null) return match[1];
}



let theme;

const themer = async () => {

	const [r, g, b] = await averageColor($('img'));

	(r + g + b) > 85 || !r ?
		palette['light'].bg = palette['dark'].border = `rgb(${r},${g},${b})` :
		palette['light'].bg = palette['dark'].border = `rgb(${r+34},${g+34},${b+34})`;

	getSaved('theme') ?
		theme = 'dark' :
		theme = 'light';

	const s = document.querySelector(':root').style;
	s.setProperty('--bg', palette[theme].bg);
	s.setProperty('--accent', palette[theme].accent);
	s.setProperty('--text', palette[theme].text);
	s.setProperty('--border', palette[theme].border);
	$('tabColor').setAttribute("content", palette[theme].bg);

}

$('img').addEventListener('load', themer);

if (!params.get('s') && !params.get('text'))
	$('img').src = 'Assets/default_thumbnail.avif';


const setMetadata = (thumbnail, id, title, author, authorUrl) => {

	getSaved('thumbnail') ?
		save('thumbnail', thumbnail) :
		$('img').src = thumbnail;

	$('title').href = `https://youtube.com/watch?v=${id}`;
	$('title').textContent = title;
	$('author').href = `https://youtube.com${authorUrl}`;
	$('author').textContent = author;

	if ('mediaSession' in navigator)
		navigator.mediaSession.metadata = new MediaMetadata({
			title: title,
			artist: author,
			artwork: [
				{ src: thumbnail, sizes: '96x96' },
				{ src: thumbnail, sizes: '128x128' },
				{ src: thumbnail, sizes: '192x192' },
				{ src: thumbnail, sizes: '256x256' },
				{ src: thumbnail, sizes: '384x384' },
				{ src: thumbnail, sizes: '512x512' },
              ]
		});

}

const convertSStoHHMMSS = (seconds) => {
	const hh = Math.floor(seconds / 3600);
	seconds %= 3600;
	let mm = Math.floor(seconds / 60);
	let ss = Math.floor(seconds % 60);
	if (mm < 10) mm = `0${mm}`;
	if (ss < 10) ss = `0${ss}`;
	if (hh > 0) return `${hh}:${mm}:${ss}`;
	return `${mm}:${ss}`;
}

export {
	$,
	api,
	params,
	save,
	getSaved,
	streamID,
	playlistID,
	themer,
	setMetadata,
	convertSStoHHMMSS
}