/*
Why does this exist ?

Acts as a fallback to support playback through invidious without using custom instances

Destined to be deprecated when dash streaming via piped is implemented.
*/

import { audio, favButton, favIcon, instanceSelector, listAnchor, playButton } from "./dom";
import { convertSStoHHMMSS, getSaved, notify, params, getApi, setMetaData, goTo } from "./utils";
import { autoQueue } from "../scripts/audioEvents";
import { getDB, addListToCollection } from "./libraryUtils";

const codecSelector = <HTMLSelectElement>document.getElementById('codecPreference');
const bitrateSelector = <HTMLSelectElement>document.getElementById('bitrateSelector');

/////////////////////////////////////////////////////////////

export default async function invPlayer(id: string, instance = 0) {

  const apiUrl = getApi('invidious', instance);

  const data = await fetch(apiUrl + '/api/v1/videos/' + id)
    .then(res => res.json())
    .catch(err => {
      playButton.classList.replace(playButton.className, 'ri-loader-3-line');
      if (instance < instanceSelector.length - 1) {
        notify(`switched instance from ${apiUrl} to ${getApi('invidious', instance + 1)} due to error: ${err.message}`);
        invPlayer(id, instance + 1);
        return;
      }
      notify(err.message);
      playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
      instanceSelector.selectedIndex = 0;
    });


  if (!data || !data?.adaptiveFormats?.length) {
    notify('No Audio Streams Found');
    playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
    return;
  }

  type audioStream = Record<'type' | 'url' | 'quality' | 'bitrate' | 'encoding' | 'clen', string>;

  const audioStreams = data.adaptiveFormats
    .filter((_: audioStream) => _.hasOwnProperty('audioChannels'))
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

  const enforceProxy = getSaved('enforceProxy') === 'true';
  const isMusic = enforceProxy || data.genre === 'Music';
  const ivApi = getApi('invidious', instance);

  function proxyHandler(url: string) {
    const oldUrl = new URL(url);

    // only proxy music streams
    const host = isMusic ? ivApi : `https://${oldUrl.searchParams.get('host')}`;

    return url.replace(oldUrl.origin, host);
  }

  audioStreams.forEach((
    _: audioStream,
    i: number
  ) => {
    const bitrate = parseInt(_.bitrate);
    const codec = _.type.includes('opus') ? 'opus' : 'aac';
    const quality = Math.floor(bitrate / 1024) + ' kbps ' + codec;
    const size = (parseInt(_.clen) / (1024 * 1024)).toFixed(2) + ' MB';

    // add to DOM
    bitrateSelector.add(new Option(`${quality} - ${size}`, proxyHandler(_.url)));

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
    data.author = data.author.slice(0, -8);
  }

  setMetaData(
    id,
    data.title,
    data.author,
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
      (stream: StreamItem) => {
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

    // just in case we are already in the discover collection 
    if (listAnchor.classList.contains('view') && params.get('collection') === 'discover')
      goTo('discover');

  }, 20000);
}
