import { setMetadata, streamID, playlistID, getSaved, save, params, updatePositionState, setAudio } from './lib/helperFunctions.js';

const api = [
	'https://pipedapi.kavin.rocks',
	'https://pipedapi.in.projectsegfau.lt',
	'https://watchapi.whatever.social',
	'https://api-piped.mha.fi',
	'https://pipedapi.syncpundit.io',
	'https://piped-api.garudalinux.org',
	'https://pipedapi.moomoo.me'
];
const queueArray = [];
let queueCount = 0;
let queue = false;
let queueNow = 1;
let previous_ID;


// link validator

const validator = (val, pID, sID) => {
	if (val) {
		pID = playlistID(val);
		sID = streamID(val);
	}
	if (sID)
		queue ? queueIt(sID) : play(sID);
	else if (pID)
		queue ? queueIt(pID) : playlistLoad(pID);

	// so that it does not run again for the same link
	previous_ID = pID || sID;
}

// Loads streams into related streams container

const streamsLoader = streamsArray => {
	for (const stream of streamsArray) {
		const listItem = document.createElement('list-item');
		listItem.textContent = stream.title || stream.name;
		listItem.dataset.author = stream.uploaderName || stream.description;
		listItem.addEventListener('click', () => {
			switch (stream.type) {
				case 'stream':
					validator(null, null, stream.url.slice(9));
					break;
				case 'playlist':
					validator(null, stream.url.slice(15), null);
					break;
				case 'channel':
					open('https://youtube.com' + stream.url);
					//		fetch(api[0] + stream.url).then(res => res.json()).then(channel => streamsLoader(channel.relatedStreams));
					break;
			}
		});
		listItem.dataset.thumbnail = stream.thumbnail;
		relatedStreamsContainer.appendChild(listItem);
	}
}

// The main player function

const play = async (id, instance = 0) => {

	playButton.classList.replace(playButton.classList[0], 'spinner')
	const data = await fetch(api[instance] + '/streams/' + id).then(res => res.json()).catch(err => {
		if (instance < api.length - 1) {
			play(id, instance + 1);
			return;
		}
		alert(err);
	});

	setMetadata(
		data.thumbnailUrl,
		id,
		data.title,
		data.uploader,
		data.uploaderUrl
	);


	if (!data.audioStreams.length) {
		alert('NO AUDIO STREAMS AVAILABLE.');
		return;
	}

	setAudio(data.audioStreams);


	// Subtitle data Injection into dom

	subtitleSelector.innerHTML = '<option value="">Subtitles - Off</option>';
	subtitleSelector.classList.remove('hide');
	if (data.subtitles.length)
		for (const subtitles of data.subtitles) subtitleSelector.add(new Option(subtitles.name, subtitles.url));
	else
		subtitleSelector.classList.add('hide');

	// setting related streams
	relatedStreamsContainer.innerHTML = '';
	streamsLoader(data.relatedStreams);

	params.set('s', id);
	history.pushState({}, '', '?' + params);

}



// next track 
const next = () => {
	if ((queueCount - queueNow) < 0) return;
	audio.currentTime = 0;
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


const playlistLoad = async (id, instance = 0) => {

	const data = await fetch(api[instance] + '/playlists/' + id).then(res => res.json()).catch(err => {
		if (instance < api.length - 1) {
			playlistLoad(id, instance + 1);
			return;
		}
		alert(err);
	});

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

}


// input text player

superInput.addEventListener('input', () => {
	if (!superInput.value.includes(previous_ID))
		validator(superInput.value);
});



const searchLoader = (instance = 0) => {

	relatedStreamsContainer.innerHTML = '';

	fetch(api[instance] + '/search?q=' + superInput.value + '&filter=' + searchFilters.value)
		.then(res => res.json())
		.then(searchResults => streamsLoader(searchResults.items))
		.catch(err => {
			if (instance < api.length - 1) {
				searchLoader(id, instance + 1);
				return;
			}
			alert(err)
		});

	relatedStreamsButton.click();
}

superInput.addEventListener('keypress', e => {
	if (e.key === 'Enter') searchLoader();
});

document.querySelector('.ri-search-2-line').onclick = () => searchLoader();


// URL params 

if (params.get('s')) // stream
	validator(null, null, params.get('s'));

if (params.get('p')) { // playlist
	validator(null, params.get('p'));
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


if ('mediaSession' in navigator) {
	navigator.mediaSession.setActionHandler('play', () => {
		audio.play();
		updatePositionState();
	});
	navigator.mediaSession.setActionHandler('pause', () => {
		audio.pause();
		updatePositionState();
	});
	navigator.mediaSession.setActionHandler("seekforward", () => {
		audio.currentTime += 10;
		updatePositionState();
	});
	navigator.mediaSession.setActionHandler("seekbackward", () => {
		audio.currentTime -= 10;
		updatePositionState();
	});
	navigator.mediaSession.setActionHandler("seekto", e => {
		audio.currentTime = e.seekTime;
		updatePositionState();
	});
	navigator.mediaSession.setActionHandler("nexttrack", next);
}