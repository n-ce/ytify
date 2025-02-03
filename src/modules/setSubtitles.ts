import { audio, img, subtitleContainer, subtitleSelector, subtitleTrack } from '../lib/dom';


export function setSubtitles(subtitles: Record<'name' | 'url', string>[]) {

  // Subtitle data dom injection

  subtitleSelector.classList.remove('hide');
  subtitleSelector.innerHTML = '<option>Subtitles</option>'
  subtitleContainer.innerHTML = '';

  if (subtitles.length)
    for (const subtitle of subtitles)
      subtitleSelector.add(
        new Option(subtitle.name, subtitle.url)
      );
  else {
    subtitleTrack.src = '';
    subtitleContainer.classList.add('hide');
    subtitleSelector.classList.add('hide');
    subtitleContainer.firstChild?.remove();
  }
}

async function parseTTML() {

  const imsc = await import('imsc/dist/imsc.all.min.js');
  const myTrack = audio.textTracks[0];
  myTrack.mode = 'hidden';
  const d = img.getBoundingClientRect();


  subtitleContainer.style.top = Math.floor(d.y) + 'px';
  subtitleContainer.style.left = Math.floor(d.x) + 'px';
  subtitleSelector.parentElement!.style.position = 'static';
  subtitleSelector.style.top = Math.floor(d.y) + 'px';
  subtitleSelector.style.left = Math.floor(d.x) + 'px';


  fetch(subtitleTrack.src)
    .then(res => res.text())
    .then(text => {

      const imscDoc = imsc.fromXML(text);
      const timeEvents = imscDoc.getMediaTimeEvents();
      const telen = timeEvents.length;

      for (let i = 0; i < telen; i++) {
        const myCue = new VTTCue(timeEvents[i], (i < telen - 1) ? timeEvents[i + 1] : audio.duration, '');

        myCue.onenter = () => {
          const subtitleActive = subtitleContainer.firstChild;
          if (subtitleActive)
            subtitleContainer.removeChild(subtitleActive);
          imsc.renderHTML(
            imsc.generateISD(imscDoc, myCue.startTime),
            subtitleContainer,
            img,
            Math.floor(d.height),
            Math.floor(d.width)
          );
        }
        myCue.onexit = () => {
          const subtitleActive = subtitleContainer.firstChild;
          if (subtitleActive)
            subtitleContainer.removeChild(subtitleActive)
        }
        myTrack.addCue(myCue);
      }
    });
}

subtitleSelector.addEventListener('change', () => {
  subtitleTrack.src = subtitleSelector.value;
  if (subtitleSelector.selectedIndex > 0) {
    subtitleContainer.classList.remove('hide')
    parseTTML();
  } else {
    subtitleContainer.classList.add('hide');
    subtitleContainer.style.top = '0';
    subtitleContainer.style.left = '0';
    subtitleSelector.parentElement!.style.position = 'relative';
    subtitleSelector.style.top = '0'
    subtitleSelector.style.left = '0';
  }
});
