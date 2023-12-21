import {
  audio, bitrateSelector, discoveryStorageLimit, favButton, favIcon, playButton,/*, subtitleContainer, subtitleSelector, subtitleTrack */
  invidiousInstances
} from "./dom";
import { convertSStoHHMMSS, getDB, getSaved, params, /*parseTTML,*/ setMetaData } from "./utils";
import { addListToCollection } from "../scripts/library";


const preferOpusSwitch = <HTMLElement>document.getElementById('preferOpusSwitch');

if (navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') <= -1)
  preferOpusSwitch.removeAttribute('checked');

const [opusGroup, aacGroup] = <HTMLCollectionOf<HTMLOptGroupElement>>bitrateSelector.children;

export default async function player(id: string | null = '') {

  if (!id) return;

  playButton.classList.replace(playButton.className, 'ri-loader-3-line');

  const data = await fetch(invidiousInstances.value + '/api/v1/videos/' + id + '?fields=title,lengthSeconds,adaptiveFormats,author,authorUrl,recommendedVideos').then(res => res.json()).then(_ => _.hasOwnProperty('adaptiveFormats') ? _ : { throw: new Error('No Data') }).catch(err => {
    if (invidiousInstances.selectedIndex < invidiousInstances.length - 1) {
      alert('switcing playback instance from' +
        invidiousInstances.options[invidiousInstances.selectedIndex].textContent
        + 'to ' +
        invidiousInstances.options[invidiousInstances.selectedIndex + 1].textContent);
      invidiousInstances.selectedIndex++;
      player(id);
      return;
    }
    alert(err);
    playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
    invidiousInstances.selectedIndex = 0;
  });

  const audioStreams = data.adaptiveFormats
    .filter((_: { audioChannels: string }) => _.hasOwnProperty('audioChannels'))
    .sort((a: { bitrate: number }, b: { bitrate: number }) => (a.bitrate - b.bitrate));

  if (!audioStreams.length) {
    alert('NO AUDIO STREAMS AVAILABLE.');
    playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
    return;
  }

  const opus: Codec = { urls: [], bitrates: [] };
  const aac: Codec = { urls: [], bitrates: [] };
  const wantOpus = preferOpusSwitch.hasAttribute('checked');

  opusGroup.innerHTML = '';
  aacGroup.innerHTML = '';

  audioStreams.forEach(((_: {
    type: string,
    url: string,
    quality: string,
    bitrate: string,
    encoding: string
  }) => {
    const bitrate = parseInt(_.bitrate);
    const quality = Math.floor(bitrate / 1024) + ' kbps';
    const url = (_.url).replace(new URL(_.url).origin, invidiousInstances.value);
    if (_.type.includes('opus')) {
      if (!wantOpus) return;
      opus.urls.push(url);
      opus.bitrates.push(bitrate);
      opusGroup.appendChild(new Option(quality, url));
    }
    else {
      aac.urls.push(url);
      aac.bitrates.push(bitrate);
      aacGroup.appendChild(new Option(quality, url));
    }
  }));


  // using lowest aac stream when low opus bitrate unavailable

  if (!getSaved('quality') &&
    opus.bitrates[0] > 65536
    && wantOpus)
    (<HTMLOptionElement>aacGroup.firstElementChild).selected = true;

  const codec = (wantOpus ? opus : aac);
  const index = getSaved('quality') ? (codec.length || 0) - 1 : 0;

  bitrateSelector.selectedIndex = index;

  audio.src = codec.urls[index];



  // remove ' - Topic' from name if it exists
  data.author = data.author.replace(' - Topic', '');

  setMetaData(
    id,
    data.title,
    data.author,
    data.authorUrl
  );

  /*
    // Subtitle data Injection into dom
  
    subtitleSelector.innerHTML = '<option value="">Subtitles</option>';
    subtitleSelector.classList.remove('hide');
    subtitleContainer.innerHTML = '';
    if (data.captions.length)
      for (const subtitles of data.captions) subtitleSelector.add(new Option(subtitles.label, playbackInstance.value + subtitles.url));
    else {
      subtitleTrack.src = '';
      subtitleContainer.classList.add('hide');
      subtitleSelector.classList.add('hide');
      parseTTML();
    }
  */

  params.set('s', id);

  if (location.pathname === '/')
    history.replaceState({}, '', location.origin + '?s=' + params.get('s'));

  audio.dataset.id = id;
  audio.dataset.title = data.title;
  audio.dataset.author = data.author;
  audio.dataset.duration = convertSStoHHMMSS(data.lengthSeconds);
  audio.dataset.channelUrl = data.authorUrl;



  // favbutton state
  // reset
  if (favButton.checked) {
    favButton.checked = false;
    favIcon.classList.remove('ri-heart-fill');
  }

  // set
  if (getDB().favorites?.hasOwnProperty(id)) {
    favButton.checked = true;
    favIcon.classList.add('ri-heart-fill');
  }


  const dsLimit = parseInt(discoveryStorageLimit.value);
  if (!dsLimit) return;

  // related streams data injection as discovery data after 10 seconds

  setTimeout(() => {
    if (id !== audio.dataset.id) return;

    const db = getDB();
    if (!db.hasOwnProperty('discover')) db.discover = {};

    data.recommendedVideos.forEach((stream: {
      lengthSeconds: number,
      videoId: string,
      title: string,
      author: string,
      authorUrl: string
    }) => {
      if (stream.lengthSeconds < 100 || stream.lengthSeconds > 3000) return;

      const rsId = stream.videoId;
      // merges previous discover items with current related streams
      db.discover.hasOwnProperty(rsId) ?
        (<number>db.discover[rsId].frequency)++ :
        db.discover[rsId] = {
          id: rsId,
          title: stream.title,
          author: stream.author,
          duration: convertSStoHHMMSS(stream.lengthSeconds),
          channelUrl: stream.authorUrl,
          frequency: 1
        }
    });

    // convert to array
    let array = Object.entries(db.discover);

    // Randomize Array
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }

    // remove if exists in history

    array = array.filter(e => !db.history.hasOwnProperty(e[0]));

    // randomly remove items from array when limit crossed
    let len = array.length;
    while (len > dsLimit) {
      const i = Math.floor(Math.random() * len)
      array.splice(i, 1);
      len--;
    }

    // convert the new merged+randomized discover back to object and inject it
    addListToCollection('discover', Object.fromEntries(array), db);
  }, 20000);
}
