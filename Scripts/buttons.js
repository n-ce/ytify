import { params, themer, getSaved, save, convertSStoHHMMSS } from './lib/functions.js';
import { settingsButton, themeButton, fullscreenButton, thumbnailButton, qualityButton, deleteButton, feedbackButton, seekBwdButton, seekFwdButton, queueButton, loopButton, inputUrl, formInput, audio, progress, playSpeed, playButton, currentDuration, fullDuration, img, cssVar, tabColor } from './lib/DOM.js';


// settings panel toggle

settingsButton.addEventListener('click', () => {
		[themeButton, fullscreenButton, thumbnailButton, qualityButton, deleteButton, feedbackButton, seekBwdButton, seekFwdButton, queueButton, loopButton, inputUrl
		].map(e => e.classList.toggle('hide'));

	if (queueButton.firstElementChild.classList[1] === 'on') {
		loopButton.classList.toggle('hide');
		queueNextButton.classList.toggle('hide');
	}
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
	if (thumbnail) {
		save('thumbnail', img.src);
	} else {
		img.src = getSaved('thumbnail');
		localStorage.removeItem('thumbnail');
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
	location.replace(location.origin);
})

// Feedback Button

feedbackButton.addEventListener('click', async () => {
	formInput.value = await prompt('Enter your feedback (bugs, feature requests) here:');
	if (formInput.value) document.forms[0].submit();
})



// bitrate selector

bitrateSelector.addEventListener('change', () => {
	const timeOfSwitch = audio.dataset.seconds;
	audio.src = bitrateSelector.value;
	audio.currentTime = timeOfSwitch;
	audio.play();
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
	if (inputUrl.value) audio.play();
});


// PLAYBACK SPEED

playSpeed.addEventListener('change', () => {
	if (playSpeed.value < 0 || playSpeed.value > 4) {
		return;
	}
	audio.playbackRate = playSpeed.value;
	playSpeed.blur();
});



// Seek Forward && Backward

seekFwdButton.addEventListener('click', () =>
	audio.currentTime += 10);

seekBwdButton.addEventListener('click', () =>
	audio.currentTime -= 10);



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
	loopButton.dataset.state ?
		loopButton.dataset.state = '' :
		loopButton.dataset.state = '1';
});