import { setMetaData, getSaved, save, params, orderByFrequency, similarStreamsCollector, shuffleArray } from './lib/utils.js';

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
		if (confirm('Reload app because fetching piped instances failed with error: ' + err))
			location.reload();
	});

// Instance Selector change event

pipedInstances.addEventListener('change', () => {
	save('pipedInstance', pipedInstances.options[pipedInstances.selectedIndex].textContent)
	if (previous_ID)
		play(previous_ID);
});


// link validator

let previous_ID;
const validator = (val, playlistID, streamID) => {

	if (val) {
		playlistID = val.match(/[&?]list=([^&]+)/i)?.[1];
		streamID = val.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i)?.[7];
	}
	if (streamID)
		queueState.contains('on') ? queueIt(streamID) : play(streamID);
	else if (playlistID)
		queueState.contains('on') ? queueIt(playlistID) : playlistLoad(playlistID);

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
	return fragment;
}

// Get search results of input

const searchLoader = () => {
	if (!superInput.value) return;

	searchlistContainer.innerHTML = '';

	fetch(pipedInstances.value + '/search?q=' + superInput.value + '&filter=' + searchFilters.value)
		.then(res => res.json())
		.then(searchResults => searchlistContainer.appendChild(streamsLoader(searchResults.items)))
		.catch(err => {
			if (pipedInstances.selectedIndex < pipedInstances.length - 1) {
				pipedInstances.selectedIndex++;
				searchLoader();
				return;
			}
			alert(err)
		});
	suggestions.style.display = 'none';
}

// super input supports both searching and direct link, also loads suggestions

superInput.addEventListener('input', async () => {

	suggestions.innerHTML = '';
	suggestions.style.display = 'none';

	if (!superInput.value.includes(previous_ID))
		if (validator(superInput.value))
			return;

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

superInput.addEventListener('keypress', e => {
	if (e.key === 'Enter') searchLoader();
});

superInputContainer.lastElementChild.addEventListener('click', searchLoader);

searchFilters.addEventListener('change', searchLoader);


// Autoplay Button

const autoplayState = autoplayButton.firstElementChild.classList;
autoplayButton.addEventListener('click', () => {
	relativesHistory.length = 0;
	loopButton.classList.toggle('hide');
	loopButton.firstElementChild.classList.remove('on');
	audio.loop = false;
	queueButton.classList.toggle('hide');
	autoplayButton.firstElementChild.classList.toggle('on');
	queuelist.innerHTML = '';
	queuelistButton.dataset.badge = 0;
	autoplayQueue.length = 0;
	playNextButton.classList.toggle('hide');
});




/*
-  autoplay algorithm
1. searches the stream title with playlist filter
2. fetches streams of first (depth) no of playlists
3. orders all streams by frequency
4. gets most frequent streams 
5. appends them to autoplayqueue
*/

const streamHistory = [];
const autoplayQueue = [];
const relativesHistory = [];

const autoplayFX = async relatives => {
	autoplayButton.firstElementChild.classList.replace('spinner', 'ri-magic-line');

	for (const relative of relatives)
		relativesHistory.push(relative);

	relatives = orderByFrequency(relativesHistory).filter(stream => !streamHistory.includes(stream) && !autoplayQueue.includes(stream));

	if (relatives.length) {
		for await (const id of relatives) {
			await appendToQueuelist(id);
			autoplayQueue.push(id);
		}
		queuelistButton.dataset.badge = autoplayQueue.length;
	}
}


const queueArray = [];
const queueNodes = queuelist.children;

const appendToQueuelist = async id => {
	const data = await fetch('https://noembed.com/embed?dataType=json&url=https://youtu.be/' + id).then(res => res.json());
	const listItem = document.createElement('list-item');
	listItem.textContent = data.title;
	listItem.dataset.author = data.author_name;
	listItem.dataset.thumbnail = data.thumbnail_url;
	listItem.addEventListener('click', () => {
		if (removefromQueueState === false)
			play(id);
		const queue = queueArray.length ? queueArray : autoplayQueue;
		const index = queue.indexOf(id);
		queue.splice(index, 1);
		queuelistButton.dataset.badge = queue.length;
		queuelist.removeChild(queueNodes[index]);
	});
	queuelist.appendChild(listItem);
}


const isSafari = navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') <= -1;

// The main player function

const play = async id => {
	if (id.length !== 11) {
		playlistLoad(id);
		return;
	}
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
		if (value.codec === "opus") {
			if (isSafari) continue;
			opus.urls.push(value.url);
			opus.bitrates.push(parseInt(value.quality));
			bitrateSelector.add(new Option(value.quality, value.url));
		}
		else {
			m4a.urls.push(value.url);
			m4a.bitrates.push(parseInt(value.quality));
			isSafari ?
				bitrateSelector.add(new Option(value.quality, value.url)) :
				m4a.options.push(new Option(value.quality, value.url));
		}
	}

	// finding lowest available stream when low opus bitrate unavailable
	if (!getSaved('quality') && Math.min(...opus.bitrates) > 64 && !isSafari) {
		opus.urls = opus.urls.concat(m4a.urls);
		opus.bitrates = opus.bitrates.concat(m4a.bitrates);
		for (const opts of m4a.options) bitrateSelector.add(opts);
	}

	const codec = (isSafari ? m4a : opus);
	bitrateSelector.selectedIndex = codec.bitrates.indexOf(getSaved('quality') ? Math.max(...codec.bitrates) : Math.min(...codec.bitrates));
	audio.src = codec.urls[bitrateSelector.selectedIndex];


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
	relatedStreamsContainer.innerHTML = '';
	relatedStreamsContainer.appendChild(streamsLoader(data.relatedStreams));

	params.set('s', id);
	history.pushState({}, '', '?' + params);

	// autoplay init
	if (autoplayState.contains('on')) {
		autoplayButton.firstElementChild.classList.replace('ri-magic-line', 'spinner');
		streamHistory.push(id);
		autoplayFX(
			await similarStreamsCollector(
				data.title + (data.uploader.includes(' - Topic') ? ' ' + data.uploader.replace(' - Topic', '') : ''),
				id
			)
		);
	}
}



// link queuing algorithm

const queueIt = async id => {
	queueArray.push(id);
	await appendToQueuelist(id);
	queuelistButton.dataset.badge = queueArray.length;
}


// playback on end strategy
const queueState = queueButton.firstElementChild.classList;

audio.onended = () => {
	if (queueArray.length) {
		play(queueArray.shift());
		queuelistButton.dataset.badge = queueArray.length;
		queuelist.removeChild(queuelist.firstElementChild);
	}
	else if (autoplayQueue.length) {
		play(autoplayQueue.shift());
		queuelistButton.dataset.badge = autoplayQueue.length;
		queuelist.removeChild(queuelist.firstElementChild);
	}
	else {
		playButton.classList.replace('ri-play-line', 'ri-stop-line');
		playButton.dataset.state = '1';
	}
}



// queue functions and toggle

const queueFx = () => {
	queueArray.length = 0;
	queuelistButton.dataset.badge = 0;
	queueButton.firstElementChild.classList.toggle('on');
	queuelist.innerHTML = '';
	playNextButton.classList.toggle('hide');
	loopButton.classList.toggle('hide');
	loopButton.firstElementChild.classList.remove('on');
	audio.loop = false;
	autoplayButton.classList.toggle('hide');
	params.delete('p');
	history.pushState({}, '', '?' + params);
}
queueButton.addEventListener('click', queueFx);



const playlistLoad = async id => {

	const data = await fetch(pipedInstances.value + '/playlists/' + id).then(res => res.json()).catch(err => {
		if (pipedInstances.selectedIndex < pipedInstances.length - 1) {
			pipedInstances.selectedIndex++;
			playlistLoad(id);
			return;
		}
		alert(err);
	});

	if (!queueState.contains('on'))
		queueFx();

	setMetaData(
		data.thumbnailUrl,
		id,
		data.name,
		'Click on Next Button to start',
		'');
	for await (const i of data.relatedStreams)
	await queueIt(i.url.slice(9));

	params.set('p', id);
	history.pushState({}, '', '?' + params);

}

// Shuffle Play


shuffleQueueButton.addEventListener('click', () => {
	const queue = queueArray.length ? queueArray : autoplayQueue;
	const oldQueue = queue.slice(0);
	shuffleArray(queue);
	for (const item of queue)
		queuelist.appendChild(queueNodes[oldQueue.indexOf(item)]);
});

let removefromQueueState = false;
deleteModeButton.addEventListener('click', () => {
	deleteModeButton.classList.toggle('active');
	removefromQueueState = !removefromQueueState;
})

// URL params 

if (params.get('p')) { // playlist
	await playlistLoad(params.get('p'));
	queueNodes[queueArray.indexOf(params.get('s'))].click();
}
else {
	if (params.get('s')) // stream
		play(params.get('s'));

	if (params.get('t')) // timestamp
		audio.currentTime = parseInt(params.get('t'));


	// PWA Params
	if (params.get('url') || params.get('text')) {
		validator(params.get('url') || params.get('text'));
		audio.play();
	}

}