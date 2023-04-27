import { params, themer, getSaved, save, convertSStoHHMMSS, parseTTML, updatePositionState } from './lib/helperFunctions.js';

// settings panel toggle


settingsButton.addEventListener('click', () => {
	settingsButton.firstElementChild.classList.toggle('on');
	settingsContainer.classList.toggle('hide');
	dataContainer.classList.toggle('show');
	dataContainer.classList.toggle('hide');

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

let thumbnail = true;

thumbnailButton.click = () => {

	if (thumbnail)
		sessionStorage.setItem('img', img.src);
	else {
		img.src = sessionStorage.getItem('img');
		sessionStorage.removeItem('img');
	}
	thumbnail = !thumbnail;
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

// Delete Button

deleteButton.addEventListener('click', () => {
	self.caches.keys().then(s => { s.forEach(k => { self.caches.delete(k) }) });
	navigator.serviceWorker.getRegistrations().then(s => { s.forEach(r => { r.unregister() }) });
	localStorage.clear();
	location.replace(location.origin);
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
	audio.firstElementChild.src = subtitleSelector.value;
	parseTTML();
	subtitleContainer.classList.remove('hide');
})

// play button and events

const pauseIcon = 'M6 5H8V19H6V5ZM16 5H18V19H16V5Z';
const playIcon = 'M19.376 12.4158L8.77735 19.4816C8.54759 19.6348 8.23715 19.5727 8.08397 19.3429C8.02922 19.2608 8 19.1643 8 19.0656V4.93408C8 4.65794 8.22386 4.43408 8.5 4.43408C8.59871 4.43408 8.69522 4.4633 8.77735 4.51806L19.376 11.5838C19.6057 11.737 19.6678 12.0474 19.5146 12.2772C19.478 12.3321 19.4309 12.3792 19.376 12.4158Z';


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
	if (superInput.value) audio.play();
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