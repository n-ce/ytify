import { ytID, themer, imageURL, getSaved, save, input, metadata, query, audio, image, audioSRC, codecs } from './constants.js'

let codecCount = 0;

const play = (url) => {
  fetch(metadata + url)
    .then(res => res.json())
    .then(data => {
      // check if link is valid
      if (data.title !== undefined) {

        image.src = imageURL(url); // set thumbnail
        image.onload = () => {
          // image fallback when max resolution is not available
          if (image.naturalWidth == 120)
            image.src = image.src.replace('maxres', 'hq');
          themer(); // call theme when image loaded
        }

        audioSRC(data.url, codecCount);

        audio.onerror = () => {
          codecCount++;
          audioSRC(data.url, codecCount);
        }
        
        document.querySelector('#playButton').classList.add('on');
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
});