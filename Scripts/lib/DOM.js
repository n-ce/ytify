const settingsButton = document.getElementById('settingsButton');
const themeButton = document.getElementById('themeButton');
const fullscreenButton = document.getElementById('fullscreenButton');
const thumbnailButton = document.getElementById('thumbnailButton');
const qualityButton = document.getElementById('qualityButton');
const deleteButton = document.getElementById('deleteButton');
const feedbackButton = document.getElementById('feedbackButton');
const seekBwdButton = document.getElementById('seekBwdButton');
const seekFwdButton = document.getElementById('seekFwdButton');
const queueButton = document.getElementById('queueButton');
const queueNextButton = document.getElementById('queueNextButton');
const loopButton = document.getElementById('loopButton');
const inputUrl = document.getElementById('inputUrl');
const formInput = document.getElementById('formInput');
const bitrateSelector = document.getElementById('bitrateSelector');
const audio = document.getElementById('audio');
const playButton = document.getElementById('playButton');
const playSpeed = document.getElementById('playSpeed');
const progress = document.getElementById('progress');
const currentDuration = document.getElementById('currentDuration');
const fullDuration = document.getElementById('fullDuration');
const x = document.documentElement.style;
const cssVar = x.setProperty.bind(x);
const tabColor = document.getElementById('tabColor');
const img = document.getElementById('img');
const title = document.getElementById('title');
const author = document.getElementById('author');

export {
	settingsButton,
	themeButton,
	fullscreenButton,
	thumbnailButton,
	qualityButton,
	deleteButton,
	feedbackButton,
	seekBwdButton,
	seekFwdButton,
	queueButton,
	queueNextButton,
	loopButton,
	inputUrl,
	formInput,
	bitrateSelector,
	audio,
	playButton,
	playSpeed,
	progress,
	currentDuration,
	fullDuration,
	cssVar,
	tabColor,
	img,
	title,
	author
};