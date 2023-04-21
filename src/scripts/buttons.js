import { params, themer, getSaved, save, convertSStoHHMMSS, parseTTML, updatePositionState } from './lib/helperFunctions.js';
import { settingsButton, themeButton, fullscreenButton, thumbnailButton, qualityButton, deleteButton, feedbackButton, seekBwdButton, seekFwdButton, queueButton, loopButton, superInput, netlifyForm, audio, progress, playSpeed, playButton, currentDuration, fullDuration, img, relatedStreamsContainer, subtitleContainer } from './lib/DOM.js';

// settings panel toggle

settingsButton.addEventListener('click', () => {

 [themeButton, fullscreenButton, thumbnailButton, qualityButton, deleteButton, feedbackButton, seekBwdButton, seekFwdButton, queueButton, queueButton.firstElementChild.classList.length === 2 ? queueNextButton : loopButton, relatedStreamsButton, subtitleButton]
	.map(e => e.classList.toggle('hide'));

});


// Theme toggle

if (getSaved('theme'))
	themeButton.firstElementChild.classList.add('on');

themeButton.addEventListener('click', () => {
	getSaved('theme') ?
		localStorage.removeItem('theme') :
		save('theme', 'dark');
	themeButton.firstElementChild.classList.toggle('on');
	themer();
});



// fullscreen

fullscreenButton.addEventListener('click', () => {
	if (document.fullscreenElement) {
		document.exitFullscreen();
		fullscreenButton.firstElementChild.classList.remove('on');
	} else {
		document.documentElement.requestFullscreen();
		fullscreenButton.firstElementChild.classList.add('on');
	}
});



// thumbnail toggle

let thumbnail = true;

thumbnailButton.addEventListener('click', () => {

	if (thumbnail)
		sessionStorage.setItem('img', img.src);
	else {
		img.src = sessionStorage.getItem('img');
		sessionStorage.removeItem('img');
	}
	thumbnail = !thumbnail;
	thumbnailButton.firstElementChild.classList.toggle('on');
	img.classList.toggle('hide');
});



// quality

if (getSaved('quality') == 'hq')
	qualityButton.firstElementChild.classList.add('on');

qualityButton.addEventListener('click', () => {

	qualityButton.firstElementChild.classList.toggle('on');

	getSaved('quality') ?
		localStorage.removeItem('quality') : // low
		save('quality', 'hq'); // high

	if (params.get('s')) {
		params.set('t', audio.dataset.seconds);
		location.href = location.origin + '/?' + params;
	}
});

// Delete Button

deleteButton.addEventListener('click', () => {
	localStorage.clear();

	// developer use only 
	self.caches.keys()
		.then(s => s.forEach(k => self.caches.delete(k)))
		.then(s => s.forEach(r => r.unregister()))
		.then(e => navigator.serviceWorker.getRegistrations())
		.then(e => location.replace(location.origin));
});

// Feedback Button

feedbackButton.addEventListener('click', async () => {
	netlifyForm.value = await prompt('Enter your feedback (bugs, feature requests) here:');
	if (netlifyForm.value) document.forms[0].submit();
});



// bitrate selector

bitrateSelector.addEventListener('change', () => {
	const timeOfSwitch = audio.dataset.seconds;
	audio.src = bitrateSelector.value;
	audio.currentTime = timeOfSwitch;
	audio.play();
	updatePositionState();
});



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
const relatedStreamsButton = document.getElementById('relatedStreamsButton');
const dataContainer = document.getElementById('dataContainer');

relatedStreamsButton.addEventListener('click', () => {
	dataContainer.classList.toggle('show');
	dataContainer.classList.toggle('hide');
	relatedStreamsContainer.classList.toggle('list-show');
	relatedStreamsButton.firstElementChild.classList.toggle('on');
});



// subtitles 

subtitleButton.addEventListener('click', () => {
	if (subtitleContainer.classList[0])
		parseTTML();
	subtitleButton.firstElementChild.classList.toggle('on');
	subtitleContainer.classList.toggle('hide');
});