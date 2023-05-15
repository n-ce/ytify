import { setMetaData, getSaved, save, params, updatePositionState } from './lib/helperFunctions.js';

await fetch('https://piped-instances.kavin.rocks')
	.then(res => res.json())
	.then(data => {
		for (const instance of data) {
			const name = instance.name + ' ' + instance.locations;
			pipedInstances.add(new Option(name, instance.api_url));
			if (getSaved('pipedInstance') === name)
				pipedInstances.lastElementChild.selected = true;
		}
	})
	.catch(err => {
		alert('Reload app because fetching piped instances failed with error: ' + err)
	})


const queueArray = [];
let queueCount = 0;
let queue = false;
let queueNow = 1;
let previous_ID;


// link validator

const validator = (val, playlistID, streamID) => {
	if (val) {
		playlistID = val.match(/[&?]list=([^&]+)/i)?.[1];
		streamID = val.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i)?.[7];
	}
	if (streamID)
		queue ? queueIt(streamID) : play(streamID);
	else if (playlistID)
		queue ? queueIt(playlistID) : playlistLoad(playlistID);

	// so that it does not run again for the same link
	previous_ID = playlistID || streamID;
}

// Loads streams into related streams container

const streamsLoader = streamsArray => {
	const fragment = document.createDocumentFragment();
	for (const stream of streamsArray) {
		const listItem = document.createElement('list-item');
		listItem.textContent = stream.title || stream.name;
		listItem.dataset.author = stream.uploaderName || stream.description;
		listItem.dataset.thumbnail = stream.thumbnail;
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
		fragment.appendChild(listItem);
	}
	relatedStreamsContainer.innerHTML = '';
	relatedStreamsContainer.appendChild(fragment);
}

// The main player function

const play = async id => {

	playButton.classList.replace(playButton.classList[0], 'spinner');

	const data = await fetch(pipedInstances.value + '/streams/' + id).then(res => res.json()).catch(err => {
		if (pipedInstances.selectedIndex < pipedInstances.length - 1) {
			pipedInstances.selectedIndex++;
			play(id);
			return;
		}
		alert(err);
	});

	if (!data.audioStreams.length) {
		alert('NO AUDIO STREAMS AVAILABLE.');
		return;
	}

	audio.dataset.seconds = 0;


	// extracting opus streams and storing m4a streams

	const opus = { urls: [], bitrates: [] }
	const m4a = { urls: [], bitrates: [], options: [] }
	bitrateSelector.innerHTML = '';

	for (const value of data.audioStreams) {
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


	setMetaData(
		data.thumbnailUrl,
		id,
		data.title,
		data.uploader,
		data.uploaderUrl
	);


	// Subtitle data Injection into dom

	subtitleSelector.innerHTML = '<option value="">Subtitles</option>';
	subtitleSelector.classList.remove('hide');
	if (data.subtitles.length)
		for (const subtitles of data.subtitles) subtitleSelector.add(new Option(subtitles.name, subtitles.url));
	else
		subtitleSelector.classList.add('hide');

	// setting related streams
	streamsLoader(data.relatedStreams);

	params.set('s', id);
	history.pushState({}, '', '?' + params);

}

// Instance Selector change event

pipedInstances.addEventListener('change', () => {
	const index = pipedInstances.selectedIndex;
	save('pipedInstance', pipedInstances.options[index].textContent)
	if (previous_ID)
		play(previous_ID);
});


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
		playButton.dataset.state = '1';
	}
})



// queue functions and toggle

const queueFx = () => {
	queue = !queue;
	if (queue) {
		queueCount = 0;
		queueArray.length = 0;
	}
	else queueButton.firstElementChild.dataset.badge = 0;
	queueNextButton.classList.toggle('hide');
	queueButton.firstElementChild.classList.toggle('on');
	loopButton.classList.toggle('hide');
	loopButton.firstElementChild.classList.remove('on');
	audio.loop = false;
}
queueButton.addEventListener('click', queueFx);

queueNextButton.addEventListener('click', next);


const playlistLoad = async id => {

	const data = await fetch(pipedInstances.value + '/playlists/' + id).then(res => res.json()).catch(err => {
		if (pipedInstances.selectedIndex < pipedInstances.length - 1) {
			pipedInstances.selectedIndex++;
			playlistLoad(id);
			return;
		}
		alert(err);
	});

	queueFx();

	setMetaData(
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

	if (getSaved('search_suggestions')) return;
	
	suggestions.innerHTML = '';
	suggestions.style.display = 'none';
	if (superInput.value.length > 3) {
		suggestions.style.display = 'block';
		fetch(pipedInstances.value + '/suggestions/?query=' + superInput.value)
			.then(res => res.json())
			.then(data => {
				const fragment = document.createDocumentFragment();
				for (const suggestion of data) {
					const li = document.createElement('li');
					li.textContent = suggestion;
					li.onclick = () => {
						superInput.value = suggestion;
						searchLoader();
					}
					fragment.appendChild(li);
				}
				suggestions.appendChild(fragment);
			});
	}


});



const searchLoader = () => {

	fetch(pipedInstances.value + '/search?q=' + superInput.value + '&filter=' + searchFilters.value)
		.then(res => res.json())
		.then(searchResults => streamsLoader(searchResults.items))
		.catch(err => {
			if (pipedInstances.selectedIndex < pipedInstances.length - 1) {
				pipedInstances.selectedIndex++;
				searchLoader();
				return;
			}
			alert(err)
		});
	suggestions.style.display = 'none';
	relatedStreamsButton.click();
}

superInput.addEventListener('keypress', e => {
	if (e.key === 'Enter') searchLoader();
});

document.querySelector('.ri-search-2-line').addEventListener('click', searchLoader);


// URL params 

if (params.get('p')) { // playlist
	const storedID = params.get('s');
	params.delete('s');
	playlistLoad(params.get('p'));
	const interval = setInterval(() => {
		storedID === params.get('s') ?
			clearInterval(interval) :
			next();
	}, 500);
}
else {
	if (params.get('s')) // stream
		play(params.get('s'));

	if (params.get('t')) { // timestamp
		audio.currentTime = params.get('t');
	}

	// PWA Params
	if (params.get('url')) {
		validator(params.get('url'));
		audio.play();

	} else if (params.get('text')) {
		validator(params.get('text'));
		audio.play();
	}

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
	navigator.mediaSession.setActionHandler("nexttrack", () => {
		next();
		updatePositionState();
	});
}