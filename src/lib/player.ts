import {
  audio, bitrateSelector, discoveryStorageLimit, favButton, favIcon, playButton,
  invidiousInstances
} from "./dom";
import { convertSStoHHMMSS, getDB, getSaved, params, setMetaData } from "./utils";
import { addListToCollection } from "../scripts/library";


const codecSelector = <HTMLSelectElement>document.getElementById('CodecPreference');
codecSelector.addEventListener('change', async () => {
  audio.pause();
  const timeOfSwitch = audio.currentTime;
  await player(audio.dataset.id);
  audio.currentTime = timeOfSwitch;
})

if (navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') <= -1)
  codecSelector.selectedIndex = 1;


export default async function player(id: string | null = '') {

  if (!id) return;

  playButton.classList.replace(playButton.className, 'ri-loader-3-line');

  const data = await fetch(invidiousInstances.value + '/api/v1/videos/' + id + '?fields=title,lengthSeconds,adaptiveFormats,author,authorUrl,recommendedVideos').then(res => res.json()).then(_ => _.hasOwnProperty('adaptiveFormats') ? _ : { throw: new Error('No Data') }).catch(err => {
    const i = invidiousInstances.selectedIndex;
    if (i < invidiousInstances.length - 1) {
      alert('switched playback instance from ' +
        invidiousInstances.options[i].value
        + ' to ' +
        invidiousInstances.options[i + 1].value
        + ' due to error: ' + err.message
      );
      invidiousInstances.selectedIndex = i + 1;
      player(id);
      return;
    }
    alert(err.message);
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

  const bitrates: number[] = [];
  const preferedCodec = codecSelector.value;

  bitrateSelector.innerHTML = '';

  audioStreams.forEach(((_: {
    type: string,
    url: string,
    quality: string,
    bitrate: string,
    encoding: string
  }) => {
    const bitrate = parseInt(_.bitrate);
    bitrates.push(bitrate);
    const quality = Math.floor(bitrate / 1024) + ' kbps ' + (_.type.includes('opus') ? 'opus' : 'aac');
    // proxy the url
    const url = (_.url).replace(new URL(_.url).origin, invidiousInstances.value);
    bitrateSelector.add(new Option(quality, url));
  }));

  let index = -1;

  bitrateSelector.childNodes.forEach((e, i) => {
    if (e.textContent?.endsWith(preferedCodec) && index < (getSaved('quality') ? 10 : 0)) index = i;
  });

  // using lowest aac stream when low opus bitrate unavailable
  if (!getSaved('quality') && preferedCodec === 'opus' &&
    bitrates[index] > 65536)
    index = 0

  bitrateSelector.selectedIndex = index;

  audio.src = bitrateSelector.value;



  // remove ' - Topic' from name if it exists
  data.author = data.author.replace(' - Topic', '');

  setMetaData(
    id,
    data.title,
    data.author,
    data.authorUrl
  );



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
