import { setMetaData, getSaved, save, params, updatePositionState, orderByFrequency, similarStreamsCollector } from './lib/helperFunctions.js';

await fetch('https://piped-instances.kavin.rocks')
	.then(res => res.json())
	.then(data => {
		for (const instance of data) {
			const name = instance.name + ' ' + instance.locations;
			pipedInstances.add(new Option(
				name, instance.api_url, '',
				getSaved('pipedInstance') === name
			));
		}
	})
	.catch(err => {
		alert('Reload app because fetching piped instances failed with error: ' + err)
	})



// link validator

let previous_ID;

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
	return previous_ID;
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

// Autoplay Button

const autoplay = autoplayButton.firstElementChild.classList;
autoplayButton.addEventListener('click', () => {
	relativesHistory.length = 0;
	loopButton.classList.toggle('hide');
	loopButton.firstElementChild.classList.remove('on');
	audio.loop = false;
	queueButton.classList.toggle('hide');
	autoplayButton.firstElementChild.classList.toggle('on');
	autoplayNextButton.classList.toggle('hide');
});

autoplayNextButton.addEventListener('click', () => {
	audio.onended();
});

/*
-  autoplay algorithm
1. searches the stream title with playlist filter
2. fetches streams of first (depth) no of playlists
3. orders all streams by frequency
4. gets most frequent streams 
5. plays one of them randomly
*/

const streamHistory = [];
const autoplayQueue = [];
let relativesHistory = [];

const autoplayFX = relatives => {
	autoplayButton.firstElementChild.classList.replace('spinner', 'ri-magic-fill');
	relativesHistory = relativesHistory.concat(relatives.filter(relative => !relativesHistory.includes(relative)));
	relatives = orderByFrequency(relativesHistory).filter(stream => !streamHistory.includes(stream));
	if (autoplayQueue.length) {
		autoplayQueue.shift();
		queuelist.removeChild(queuelist.firstElementChild);
	}
	if (relatives.length) {
		for (const id of relatives){
			autoplayQueue.push(id);
			appendToQueuelist(id);
		}
	}
}

const appendToQueuelist = async id => {
	const data = await fetch('https://noembed.com/embed?dataType=json&url=https://youtu.be/' + id).then(res => res.json());
	const listItem = document.createElement('list-item');
	listItem.textContent = data.title;
	listItem.dataset.author = data.author_name;
	listItem.dataset.thumbnail = data.thumbnail_url;
	listItem.addEventListener('click', () => play(id));
	queuelist.appendChild(listItem);
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

	// load related streams
	streamsLoader(data.relatedStreams);

	params.set('s', id);
	history.pushState({}, '', '?' + params);

	// autoplay init
	if (autoplay.contains('on')) {
		autoplayButton.firstElementChild.classList.replace('ri-magic-fill', 'spinner');
		streamHistory.push(id);
		autoplayFX(
			await similarStreamsCollector(
				data.title + (data.uploader.includes(' - Topic') ? ' ' + data.uploader.replace(' - Topic', '') : ''),
				id
			)
		);
	}
}


// Instance Selector change event

pipedInstances.addEventListener('change', () => {
	const index = pipedInstances.selectedIndex;
	save('pipedInstance', pipedInstances.options[index].textContent)
	if (previous_ID)
		play(previous_ID);
});


// link queuing algorithm
const queueArray = [];

const queueIt = id => {
	queueArray.push(id);
	queueButton.firstElementChild.dataset.badge = queueArray.length;
	appendToQueuelist(id);
}


// playback on end strategy
let queue = false;

audio.onended = () => {
	if (queue && queueArray.length) {
		play(queueArray[0]);
		queueArray.shift();
		queueButton.firstElementChild.dataset.badge = queueArray.length;
		queuelist.removeChild(queuelist.firstElementChild);
	}
	else if (autoplay.contains('on'))
		validator(null, null, autoplayQueue[0]);
	else {
		playButton.classList.replace('ri-play-fill', 'ri-stop-fill');
		playButton.dataset.state = '1';
	}
}



// queue functions and toggle

const queueFx = () => {
	queue = !queue;
	if (queue) {
		queueArray.length = 0;
	}
	else queueButton.firstElementChild.dataset.badge = 0;
	queuelist.innerHTML = '';
	queueNextButton.classList.toggle('hide');
	queueButton.firstElementChild.classList.toggle('on');
	loopButton.classList.toggle('hide');
	loopButton.firstElementChild.classList.remove('on');
	audio.loop = false;
	autoplayButton.classList.toggle('hide');
}
queueButton.addEventListener('click', queueFx);

queueNextButton.addEventListener('click', () => {
	audio.onended();
});


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


superInput.addEventListener('input', async () => {

	suggestions.innerHTML = '';
	suggestions.style.display = 'none';

	if (!superInput.value.includes(previous_ID)) {
		if (validator(superInput.value))
			return;
	}

	if (superInput.value.length < 3 || getSaved('search_suggestions')) return;

	suggestions.style.display = 'block';


	const data = await fetch(pipedInstances.value + '/suggestions/?query=' + superInput.value).then(res => res.json());

	if (!data.length) return;

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



const searchLoader = () => {

	if (!superInput.value) return;

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

	if (params.get('t')) // timestamp
		audio.currentTime = params.get('t');


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
		audio.onended();
		updatePositionState();
	});
}
