/*
Why does this exist ?

Acts as a fallback to support playback through invidious without using custom instances

Destined to be deprecated when adaptive streaming is implemented.
*/

import { audio, favButton, favIcon, instanceSelector, playButton } from "./dom";
import { convertSStoHHMMSS, getSaved, notify, params, removeSaved, save, getApi, setMetaData } from "./utils";
import { autoQueue } from "../scripts/audioEvents";
import { getDB, addListToCollection } from "./libraryUtils";

const codecSelector = <HTMLSelectElement>document.getElementById('CodecPreference');
const bitrateSelector = <HTMLSelectElement>document.getElementById('bitrateSelector');

/////////////////////////////////////////////////////////////

codecSelector.addEventListener('change', async () => {
  const i = codecSelector.selectedIndex;
  i ?
    save('codec', String(i)) :
    removeSaved('codec');

  audio.pause();
  const timeOfSwitch = audio.currentTime;
  await invPlayer(audio.dataset.id);
  audio.currentTime = timeOfSwitch;
});


const codecSaved = getSaved('codec');

codecSaved ?
  (codecSelector.selectedIndex = parseInt(codecSaved)) :
  navigator.mediaCapabilities.decodingInfo({
    type: 'file',
    audio: {
      contentType: 'audio/ogg;codecs=opus'
    }
  }).then(res => {
    // sets AAC as default for non-supported devices
    if (!res.supported)
      codecSelector.selectedIndex = 1;
  });

/////////////////////////////////////////////////////////////

bitrateSelector.addEventListener('change', () => {
  const timeOfSwitch = audio.currentTime;
  audio.src = bitrateSelector.value;
  audio.currentTime = timeOfSwitch;
  audio.play();
});

/////////////////////////////////////////////////////////////

export default async function invPlayer(id: string | null = '') {

  if (!id) return;

  playButton.classList.replace(playButton.className, 'ri-loader-3-line');

  const apiIndex = instanceSelector.selectedIndex;
  const apiUrl = getApi('invidious');

  const data = await fetch(apiUrl + '/api/v1/videos/' + id)
    .then(res => res.json())
    .catch(err => {
      if (apiIndex < instanceSelector.length - 1) {
        notify(`switched playback instance from ${apiUrl} to ${getApi('piped', apiIndex + 1)} due to error: ${err.message}`);
        instanceSelector.selectedIndex++;
        invPlayer(id);
        return;
      }
      notify(err.message);
      playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
      instanceSelector.selectedIndex = 0;
    });



  if (!data?.adaptiveFormats?.length)
    return;

  const audioStreams = data.adaptiveFormats
    .filter((_: { audioChannels: string }) => _.hasOwnProperty('audioChannels'))
    .sort((a: { bitrate: number }, b: { bitrate: number }) => (a.bitrate - b.bitrate));

  const noOfBitrates = audioStreams.length;

  if (!noOfBitrates) {
    notify('NO AUDIO STREAMS AVAILABLE.');
    playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
    return;
  }

  const preferedCodec = codecSelector.value;
  let index = -1;

  bitrateSelector.innerHTML = '';

  audioStreams.forEach((_: {
    type: string,
    url: string,
    quality: string,
    bitrate: string,
    encoding: string
  }, i: number) => {
    const bitrate = parseInt(_.bitrate);
    const codec = _.type.includes('opus') ? 'opus' : 'aac';
    const quality = Math.floor(bitrate / 1024) + ' kbps ' + codec;

    // proxy the url
    const url = (_.url).replace(new URL(_.url).origin, getApi('invidious'));
    // add to DOM
    bitrateSelector.add(new Option(quality, url));

    // find preferred bitrate
    const codecPref = preferedCodec ? codec === preferedCodec : true;
    const hqPref = getSaved('hq') ? noOfBitrates : 0;
    if (codecPref && index < hqPref) index = i;
  });


  bitrateSelector.selectedIndex = index;
  audio.src = bitrateSelector.value;

  // remove ' - Topic' from name if it exists

  let music = false;
  if (data.author.endsWith(' - Topic')) {
    music = true;
    data.author = data.author.replace(' - Topic', '');
  }

  setMetaData(
    id,
    data.title,
    data.author,
    data.authorUrl,
    music
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


  if (getSaved('autoQueue') !== 'off')
    autoQueue(data.recommendedVideos);

  if (getSaved('discover') === 'off') return;

  // related streams data injection as discovery data after 10 seconds

  setTimeout(() => {
    if (id !== audio.dataset.id) return;

    const db = getDB();
    if (!db.hasOwnProperty('discover')) db.discover = {};
    data.recommendedVideos.forEach(
      (stream: Recommendation) => {
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
    while (len > 256) {
      const i = Math.floor(Math.random() * len)
      array.splice(i, 1);
      len--;
    }

    // convert the new merged+randomized discover back to object and inject it
    addListToCollection('discover', Object.fromEntries(array), db);
  }, 20000);
}
