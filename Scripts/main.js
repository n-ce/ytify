import {
	setMetadata,
	streamID,
	playlistID,
	getSaved,
	save,
	params
} from './lib/functions.js';

import {
	bitrateSelector,
	audio,
	inputUrl,
	playButton,
	queueButton,
	queueNextButton,
	loopButton
} from './lib/DOM.js';

let instance = 0;
let queueCount = 0;
let queueNow = 1;
let oldURL;
let queue = false;
// const queueList = new Map();
const array = [];
const api = [
  'https://pipedapi.kavin.rocks/',
  'https://watchapi.whatever.social',
  'https://pipedapi.tokhmi.xyz/',
  'https://pipedapi.syncpundit.io/',
  'https://piped-api.garudalinux.org',
  'https://pipedapi.moomoo.me/'
  ];

const play = (id) => {
	fetch(api[instance] + 'streams/' + id)
		.then(res => res.json())
		.then(data => {

			setMetadata(
				data.thumbnailUrl,
				id,
				data.title,
				data.uploader,
				data.uploaderUrl
			);

			if (data.audioStreams.length === 0) {
				alert('NO AUDIO STREAMS AVAILABLE.');
				return;
			}
			// extracting opus streams and storing m4a streams
			let bitrates = [];
			let urls = [];
			bitrateSelector.innerHTML = '';
			const m4aBitrates = [];
			const m4aUrls = [];
			const m4aOptions = [];

			for (const value of data.audioStreams) {
				if (Object.values(value).includes('opus')) {
					bitrates.push(parseInt(value.quality));
					urls.push(value.url);
					bitrateSelector.add(new Option(value.quality, value.url));
				} else {
					m4aBitrates.push(parseInt(value.quality));
					m4aUrls.push(value.url);
					m4aOptions.push(new Option(value.quality, value.url));
				}
			}

			// finding lowest available stream when low opus bitrate unavailable
			if (!getSaved('quality') && Math.min(...bitrates) > 64) {
				m4aOptions.map(opts => bitrateSelector.add(opts));
				bitrates = bitrates.concat(m4aBitrates);
				urls = urls.concat(m4aUrls);
			}

			let index = 0;
			getSaved('quality') ?
				index = bitrates.indexOf(Math.max(...bitrates)) :
				index = bitrates.indexOf(Math.min(...bitrates));

			audio.src = urls[index];

			audio.dataset.seconds = 0;

			bitrateSelector.selectedIndex = index;

			playButton.classList.replace(playButton.classList[0], 'spinner');

			params.set('s', id);
			history.pushState({}, '', '?' + params);
		})
		.catch(err => {
			instance < api.length - 1 ?
				play(id) :
				alert(err);
			instance++;
		});
}



// next track 
const next = () => {
	if ((queueCount - queueNow) > -1) {
		play(array[queueNow]);
		queueButton.firstElementChild.dataset.badge = queueCount - queueNow;
		queueNow++;
	}
}


// link queuing algorithm

const queueIt = id => {
	queueCount++;
	queueButton.firstElementChild.dataset.badge = queueCount - queueNow + 1;
	array[queueCount] = oldURL = id;
}

// playback on end strategy
audio.addEventListener('ended', () => {
	if (queue)
		next(); // queue = on
	else { // queue = off

		if (loopButton.dataset.state) // loop = on
			audio.play();
		else { // loop = off
			playButton.classList.replace('ri-play-fill', 'ri-stop-fill');
			playButton.dataset.state = '1';
		}

	}
})



// queue functions and toggle

const queueFx = () => {
	queue = !queue;
	if (queue) queueCount = 0;
	queueNextButton.classList.toggle('hide');
	queueButton.firstElementChild.classList.toggle('on');
	loopButton.classList.toggle('hide')
	loopButton.firstElementChild.classList.remove('on');
}
queueButton.addEventListener('click', queueFx);

queueNextButton.addEventListener('click', next);


const playlistLoad = (id) => {
	fetch(api[instance] + 'playlists/' + id)
		.then(res => res.json())
		.then(data => {
			queueFx();
			setMetadata(
				data.thumbnailUrl,
				id,
				data.name,
				'Click on Next Button to start',
				'');
			for (const i of data.relatedStreams)
				queueIt(i.url.slice(9));
		})
		.catch(err => {
			instance < api.length - 1 ?
				playlistLoad(id) :
				alert(err);
			instance++;
		});
	params.set('p', id);
	history.pushState({}, '', '?' + params);

}


const validator = (val) => {
	const pID = playlistID(val);
	const sID = streamID(val);

	if (sID)
		queue ? queueIt(sID) : play(sID);
	else if (pID)
		queue ? queueIt(pID) : playlistLoad(pID);

	// so that it does not run again for the same link
	oldURL = val;
}

// input text player

inputUrl.addEventListener('input', () => {
	if (oldURL != inputUrl.value)
		validator(inputUrl.value);
});


// URL params 

if (params.get('s')) // stream
	validator('https://youtube.com/watch?v=' + params.get('s'));

if (params.get('p')) { // playlist
	validator('https://youtube.com/playlist?list=' + params.get('p'));
	params.delete('p'); // stop param from interferring rest of the program
}
if (params.get('t')) { // timestamp
	audio.currentTime = params.get('t');
	params.delete('t');
}

// PWA Params
if (params.get('url')) {
	validator(params.get('url'));
	params.delete('url');
	audio.play();

} else if (params.get('text')) {
	validator(params.get('text'));
	params.delete('text');
	audio.play();
}