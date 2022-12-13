import { ytID, themer, imageURL, getSaved, save, input, metadata, query, audio } from './constants.js'



let codecCount = 0;

const play = (url) => {
  fetch(metadata + url)
    .then(res => res.json())
    .then(data => {
      // check if link is valid
      if (data.title !== undefined) {
        // Playback
        audio.src = `https://projectlounge.pw/ytdl/download?url=${data.url}&format=${getSaved('quality').split(',')[codecCount]}`;

        themer(imageURL(url), getSaved('theme'));
        audio.onerror = () => {
          codecCount++;
          play(url);
        }
        document.querySelector('#title').innerText = data.title;
        document.querySelector('#author').innerText = data.author_name;
        history.pushState('', '', location.origin + '/?q=' + ytID(url));
        history.replaceState('', '', location.origin + '/?q=' + ytID(url));

      }
    });
}
if (query != null) {
  input.value = 'https://m.youtube.com/watch?v=' + query;
  play(input.value);
}

input.addEventListener('input', () => {
  play(input.value);
  playButton.innerText = 'play_arrow';
});

const playButton = document.querySelector('#playButton');
let playback = true;

playButton.addEventListener('click', () => {
  if (playback) {
    audio.play();
    playButton.innerText = 'pause';
  } else {
    audio.pause();
    playButton.innerText = 'play_arrow';
  }
  playback = !playback;
});
audio.onended = () => {
  playButton.innerText = 'stop';
}