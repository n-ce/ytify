import { setMetadata, streamID, playlistID, getSaved, save, params } from './lib/functions.js';
import { bitrateSelector, audio, inputUrl, playButton, queueButton, queueNextButton, loopButton, relatedStreamsContainer, subtitleContainer } from './lib/DOM.js';

const api = await fetch("https://piped-instances.kavin.rocks").then(res => res.json()).then(data => data.map(e => e.api_url)).catch(e => 'https://pipedapi.kavin.rocks');
const queueArray = [];
let queueCount = 0;
let queue = false;
let queueNow = 1;
let previous_ID;


const play = (id, instance = 0) => {

	fetch(api[instance] + '/streams/' + id)
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

			const index = getSaved('quality') ?
				bitrates.indexOf(Math.max(...bitrates)) :
				bitrates.indexOf(Math.min(...bitrates));

			audio.src = urls[index];

			if (data.subtitles.length) {
				subtitleButton.disabled = false;
				audio.firstElementChild.src = data.subtitles[0].url;
			} else {
				subtitleButton.disabled = true;
			}

			audio.dataset.seconds = 0;

			bitrateSelector.selectedIndex = index;

			playButton.classList.replace(playButton.classList[0], 'spinner');


			// setting related streams

			relatedStreamsContainer.innerHTML = '';

			for (const stream of data.relatedStreams) {
				const listItem = document.createElement('list-item');
				listItem.textContent = stream.title;
				listItem.dataset.author = stream.uploaderName;
				listItem.addEventListener('click', () => {
					queue ?
						queueIt(stream.url.slice(9)) :
						play(stream.url.slice(9));
				});
				listItem.dataset.thumbnail = stream.thumbnail;
				relatedStreamsContainer.appendChild(listItem);
			}

			params.set('s', id);
			history.pushState({}, '', '?' + params);

		})
		.catch(err => {
			if (instance < api.length - 1) {
				play(id, instance + 1);
				return;
			}
			alert(err);
		});

}



// next track 
const next = () => {
	if ((queueCount - queueNow) < 0) return;

	play(queueArray[queueNow]);
	queueButton.firstElementChild.dataset.badge = queueCount - queueNow;
	queueNow++;
}


// link queuing algorithm

const queueIt = id => {
	queueCount++;
	queueButton.firstElementChild.dataset.badge = queueCount - queueNow + 1;
	queueArray[queueCount] = previous_ID = id;
}

// playback on end strategy
audio.addEventListener('ended', () => {
	if (queue) {
		next();
	} else {
		playButton.classList.replace('ri-play-fill', 'ri-stop-fill');
		playButton.dataset.state = '1'
	}
})



// queue functions and toggle

const queueFx = () => {
	queue = !queue;
	queue ?
		queueCount = 0 :
		queueButton.firstElementChild.dataset.badge = 0;
	queueNextButton.classList.toggle('hide');
	queueButton.firstElementChild.classList.toggle('on');
	loopButton.classList.toggle('hide');
	loopButton.firstElementChild.classList.remove('on');
	audio.loop = false;
}
queueButton.addEventListener('click', queueFx);

queueNextButton.addEventListener('click', next);


const playlistLoad = (id, instance = 0) => {
	fetch(api[instance] + '/playlists/' + id)
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

			params.set('p', id);
			history.pushState({}, '', '?' + params);
		})
		.catch(err => {
			if (instance < api.length - 1) {
				playlistLoad(id, instance + 1);
				return;
			}
			alert(err);
		});

}

// link validator

const validator = (val) => {
	const pID = playlistID(val);
	const sID = streamID(val);

	if (sID)
		queue ? queueIt(sID) : play(sID);
	else if (pID)
		queue ? queueIt(pID) : playlistLoad(pID);

	// so that it does not run again for the same link
	previous_ID = pID || sID;
}

// input text player

inputUrl.addEventListener('input', () => {
	if (!inputUrl.value.includes(previous_ID))
		validator(inputUrl.value);
	inputUrl.style.width = inputUrl.value.length + 'ch';
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