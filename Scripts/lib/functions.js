import { cssVar, tabColor, img, title, author } from './DOM.js';


const params = (new URL(document.location)).searchParams;

const save = localStorage.setItem.bind(localStorage);

const getSaved = localStorage.getItem.bind(localStorage);

const streamID = (url) => {
	const match = url.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i);
	if (match) return match[7];
}
const playlistID = (url) => {
	const match = url.match(/[&?]list=([^&]+)/i);
	if (match) return match[1];
}


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
		text: '#fffb',
		border: '#fff7'
	}
};

const themer = () => {

	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d');

	const canvasImg = new Image();

	canvasImg.onload = () => new Promise((resolve, reject) => {
			canvas.height = canvasImg.height;
			canvas.width = canvasImg.width;
			context.drawImage(canvasImg, 0, 0);
			resolve(context.getImageData(0, 0, canvasImg.width, canvasImg.height).data);
		})
		.then(data => {

			/* this [r-g-b from raw data] processing 
			algorithm was taken from color.js,
			https://github.com/luukdv/color.js */

			const len = data.length;
			const nthPixel = 40;
			let r = 0;
			let g = 0;
			let b = 0;
			for (let i = 0; i < len; i += nthPixel) {
				r += data[i];
				g += data[i + 1];
				b += data[i + 2];
			}
			
			const amount = len / nthPixel;
			r = Math.round(r / amount);
			g = Math.round(g / amount);
			b = Math.round(b / amount);

			const theme = getSaved('theme') ? 'dark' : 'light';

			palette['dark'].border =
				palette['light'].bg =
				(r + g + b) > 85 || !r ?
				`rgb(${r},${g},${b})` :
				`rgb(${r+34},${g+34},${b+34})`;


			cssVar('--bg', palette[theme].bg);
			cssVar('--accent', palette[theme].accent);
			cssVar('--text', palette[theme].text);
			cssVar('--border', palette[theme].border);
			tabColor.content = palette[theme].bg;
		});
	canvasImg.crossOrigin = '';
	canvasImg.src = img.src;
}

img.addEventListener('load', themer);


if (!params.get('s') && !params.get('text'))
	img.src = 'Assets/ytify_thumbnail_min.webp';


const setMetadata = (thumbnail, id, streamName, authorName, authorUrl) => {

	sessionStorage.getItem('img') ?
		sessionStorage.setItem('img', thumbnail) :
		img.src = thumbnail;

	title.href = `https://youtube.com/watch?v=${id}`;
	title.textContent = streamName;
	author.href = `https://youtube.com${authorUrl}`;
	author.textContent = authorName;

	document.title = streamName + ' - ytify';

	if ('mediaSession' in navigator)
		navigator.mediaSession.metadata = new MediaMetadata({
			title: streamName,
			artist: authorName,
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
	return hh > 0 ?
		`${hh}:${mm}:${ss}` :
		`${mm}:${ss}`;
}



export {
	params,
	save,
	getSaved,
	streamID,
	playlistID,
	themer,
	setMetadata,
	convertSStoHHMMSS
}
