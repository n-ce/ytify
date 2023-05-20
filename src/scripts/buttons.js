import { params, themer, getSaved, save, convertSStoHHMMSS, parseTTML, updatePositionState } from './lib/helperFunctions.js';

// settings button

let settings = true;
settingsButton.addEventListener('click', () => {
	[settingsContainer.style.right, settingsContainer.style.width] = settings ? ['0', 'calc(100% - 2rem)'] : ['-2rem', '0'];
	settings = !settings;
});
let queuelist = true;
queuelistButton.addEventListener('click', () => {
	[queuelistContainer.style.left, queuelistContainer.style.width] = queuelist ? ['0', 'calc(100% - 2rem)'] : ['-2rem', '0'];
	queuelist = !queuelist;
});


// bitrate selector

bitrateSelector.addEventListener('change', () => {
	const timeOfSwitch = audio.dataset.seconds;
	audio.src = bitrateSelector.value;
	audio.currentTime = timeOfSwitch;
	audio.play();
	updatePositionState();
});

// subtitle selector

subtitleSelector.addEventListener('change', () => {
	audio.firstElementChild.src = subtitleSelector.value;
	if (!subtitleSelector.value) {
		subtitleContainer.classList.add('hide');
		return;
	}
	parseTTML();
	subtitleContainer.classList.remove('hide');
})

// play button and events



playButton.addEventListener('click', () => {
	if (playButton.dataset.state) {
		audio.play();
		playButton.dataset.state = '';
	} else {
		audio.pause();
		playButton.dataset.state = '1';
	}
	updatePositionState();
});

audio.addEventListener('playing', () => {
	playButton.classList.replace(playButton.classList[0], 'ri-pause-fill');
	playButton.dataset.state = '';
});

audio.addEventListener('pause', () => {
	playButton.classList.replace('ri-pause-fill', 'ri-play-fill');
	playButton.dataset.state = '1';
});

audio.addEventListener('loadeddata', () => {
	playButton.classList.replace('spinner', 'ri-play-fill');
	playButton.classList.add('on');
	if (superInput.value || relatedStreamsContainer.classList.contains('list-show'))
		audio.play();
});



// PLAYBACK SPEED

playSpeed.addEventListener('change', () => {
	if (playSpeed.value < 0 || playSpeed.value > 4) {
		return;
	}
	audio.playbackRate = playSpeed.value;
	updatePositionState();
	playSpeed.blur();
});



// Seek Forward && Backward

seekFwdButton.addEventListener('click', () => {
	audio.currentTime += 10;
	updatePositionState();
});


seekBwdButton.addEventListener('click', () => {
	audio.currentTime -= 10;
	updatePositionState();
});



// PROGRESS Bar event

progress.addEventListener('change', () => {
	if (progress.value < 0 || progress.value > audio.duration)
		return;

	audio.currentTime = progress.value;
	progress.blur();
});

audio.addEventListener('timeupdate', () => {
	if (progress === document.activeElement)
		return;

	const seconds = Math.floor(audio.currentTime);
	// only update every second
	if (seconds > audio.dataset.seconds) {
		progress.value = seconds;
		currentDuration.textContent = convertSStoHHMMSS(seconds);
	}
	audio.dataset.seconds = seconds;
});


audio.addEventListener('loadedmetadata', () => {
	progress.value = 0;
	progress.min = 0;
	progress.max = Math.floor(audio.duration);
	fullDuration.textContent = convertSStoHHMMSS(audio.duration);
});



// Loop

loopButton.addEventListener('click', () => {
	loopButton.firstElementChild.classList.toggle('on');
	audio.loop = !audio.loop;
});





// streams service button

relatedStreamsButton.addEventListener('click', () => {
	dataContainer.classList.toggle('show');
	dataContainer.classList.toggle('hide');
	relatedStreamsContainer.classList.toggle('list-show');
	relatedStreamsButton.firstElementChild.classList.toggle('on');
});



// Theme toggle

if (getSaved('theme')) {
	themeButton.toggleAttribute('checked')
}

themeButton.click = () => {
	getSaved('theme') ?
		localStorage.removeItem('theme') :
		save('theme', 'dark');
	themer();
}



// fullscreen

fullscreenButton.click = () => {
	document.fullscreenElement ?
		document.exitFullscreen() :
		document.documentElement.requestFullscreen();
}



// thumbnail toggle

const image1x1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

if (getSaved('img')) {
	thumbnailButton.removeAttribute('checked');
	img.src = image1x1;
	img.classList.toggle('hide');
}

thumbnailButton.click = () => {

	if (getSaved('img')) {
		img.src = getSaved('img');
		localStorage.removeItem('img');
	}
	else {
		save('img', img.src);
		img.src = image1x1;
	}
	img.classList.toggle('hide');
}



// quality

if (getSaved('quality') == 'hq')
	qualityButton.toggleAttribute('checked');

qualityButton.click = () => {

	getSaved('quality') ?
		localStorage.removeItem('quality') : // low
		save('quality', 'hq'); // high

	if (params.get('s')) {
		params.set('t', audio.dataset.seconds);
		location.href = location.origin + '/?' + params;
	}
}



// suggestions button

suggestionsButton.click = () => {
	getSaved('search_suggestions') ?
		localStorage.removeItem('search_suggestions') :
		save('search_suggestions', 'off');
	suggestions.style.display = 'none';
}

if (getSaved('search_suggestions'))
	suggestionsButton.removeAttribute('checked')


// Delete Button

deleteButton.addEventListener('click', () => {
	self.caches.keys().then(s => { s.forEach(k => { self.caches.delete(k) }) });
	navigator.serviceWorker.getRegistrations().then(s => { s.forEach(r => { r.unregister() }) });
	localStorage.clear();
	location.replace(location.origin);
});