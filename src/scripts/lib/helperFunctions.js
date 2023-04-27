const params = (new URL(document.location)).searchParams;

const save = localStorage.setItem.bind(localStorage);

const getSaved = localStorage.getItem.bind(localStorage);

const streamID = url => url.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i)?.[7];

const playlistID = url => url.match(/[&?]list=([^&]+)/i)?.[1];



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

const x = document.documentElement.style;
const cssVar = x.setProperty.bind(x);
const tabColor = document.head.children.namedItem('theme-color');
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');

function themer() {

	const canvasImg = new Image();

	canvasImg.onload = () => {
		canvas.height = canvasImg.height;
		canvas.width = canvasImg.width;
		context.drawImage(canvasImg, 0, 0);
		const data = context.getImageData(0, 0, canvasImg.width, canvasImg.height).data;

		/* [r-g-b from raw data] processing 
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
		r /= amount;
		g /= amount;
		b /= amount;

		const theme = getSaved('theme') ? 'dark' : 'light';

		palette['dark'].border = palette['light'].bg =
			(r + g + b) > 85 || !r ?
			`rgb(${r},${g},${b})` :
			`rgb(${r+34},${g+34},${b+34})`;

		cssVar('--bg', palette[theme].bg);
		cssVar('--accent', palette[theme].accent);
		cssVar('--text', palette[theme].text);
		cssVar('--border', palette[theme].border);
		tabColor.content = palette[theme].bg;
	}

	canvasImg.crossOrigin = '';
	canvasImg.src = img.src;
}


img.addEventListener('load', themer);


if (!params.get('s') && !params.get('text'))
	img.src = 'assets/ytify_thumbnail_min.webp';



function setMetadata(thumbnail, id, streamName, authorName, authorUrl) {

	sessionStorage.getItem('img') ?
		sessionStorage.setItem('img', thumbnail) :
		img.src = thumbnail;

	title.href = `https://youtube.com/watch?v=${id}`;
	title.textContent = streamName;
	author.href = `https://youtube.com${authorUrl}`;
	author.textContent = authorName;

	document.title = streamName + ' - ytify';

	if ('mediaSession' in navigator) {
		navigator.mediaSession.setPositionState(null);
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
}



function convertSStoHHMMSS(seconds) {
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



function parseTTML() {
	const myTrack = audio.textTracks[0];
	myTrack.mode = "hidden";

	fetch(audio.firstElementChild.src)
		.then(res => res.text())
		.then(text => {
			const imscDoc = imsc.fromXML(text);
			const timeEvents = imscDoc.getMediaTimeEvents();
			const telen = timeEvents.length;

			for (let i = 0; i < telen; i++) {
				const myCue = new VTTCue(timeEvents[i], (i < telen - 1) ? timeEvents[i + 1] : audio.duration, "");

				myCue.onenter = () => {
					const subtitleActive = subtitleContainer.firstChild;
					if (subtitleActive)
						subtitleContainer.removeChild(subtitleActive)
					imsc.renderHTML(imsc.generateISD(imscDoc, myCue.startTime), subtitleContainer, '', '4rem');
				}
				myCue.onexit = () => {
					const subtitleActive = subtitleContainer.firstChild;
					if (subtitleActive)
						subtitleContainer.removeChild(subtitleActive)
				}
				myTrack.addCue(myCue);
			}
		});
}


function updatePositionState() {
	if ('mediaSession' in navigator) {
		if ('setPositionState' in navigator.mediaSession) {
			navigator.mediaSession.setPositionState({
				duration: audio.duration,
				playbackRate: audio.playbackRate,
				position: audio.currentTime,
			});
		}
	}
}

function setAudio(data) {
	// extracting opus streams and storing m4a streams

	const opus = { urls: [], bitrates: [] }
	const m4a = { urls: [], bitrates: [], options: [] }
	bitrateSelector.innerHTML = '';

	for (const value of data) {
		if (value.codec === 'opus') {
			opus.urls.push(value.url);
			opus.bitrates.push(parseInt(value.quality));
			bitrateSelector.add(new Option(value.quality, value.url));
		} else {
			m4a.urls.push(value.url);
			m4a.bitrates.push(parseInt(value.quality));
			m4a.options.push(new Option(value.quality, value.url));
		}
	}

	// finding lowest available stream when low opus bitrate unavailable
	if (!getSaved('quality') && Math.min(...opus.bitrates) > 64) {
		opus.urls = opus.urls.concat(m4a.urls);
		opus.bitrates = opus.bitrates.concat(m4a.bitrates);
		for (const opts of m4a.options) bitrateSelector.add(opts);
	}

	bitrateSelector.selectedIndex = opus.bitrates.indexOf(getSaved('quality') ? Math.max(...opus.bitrates) : Math.min(...opus.bitrates));
	audio.src = opus.urls[bitrateSelector.selectedIndex];
	audio.dataset.seconds = 0;
}


export {
	params,
	save,
	getSaved,
	streamID,
	playlistID,
	themer,
	setMetadata,
	convertSStoHHMMSS,
	parseTTML,
	updatePositionState,
	setAudio
}