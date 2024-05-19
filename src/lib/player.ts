import { audio, favButton, favIcon, playButton, instanceSelector, subtitleSelector, subtitleTrack, subtitleContainer } from "./dom";
import { convertSStoHHMMSS, notify, params, parseTTML, removeSaved, save, setMetaData, supportsOpus, getApi, getSaved } from "./utils";
import { autoQueue, hls } from "../scripts/audioEvents";
import { getDB, addListToCollection } from "./libraryUtils";


const codecSelector = <HTMLSelectElement>document.getElementById('CodecPreference');
const bitrateSelector = <HTMLSelectElement>document.getElementById('bitrateSelector');
const switchHLS = <HTMLElement>document.getElementById('HLS_Switch');

/////////////////////////////////////////////////////////////

codecSelector.addEventListener('change', async () => {
  const i = codecSelector.selectedIndex;
  i ?
    save('codec', String(i)) :
    removeSaved('codec');

  audio.pause();
  const timeOfSwitch = audio.currentTime;
  await player(audio.dataset.id);
  audio.currentTime = timeOfSwitch;
});


const codecSaved = getSaved('codec');
setTimeout(async () => {
  codecSelector.selectedIndex = codecSaved ?
    parseInt(codecSaved) :
    (await supportsOpus() ? 0 : 1)
});



/////////////////////////////////////////////////////////////

bitrateSelector.addEventListener('change', () => {
  const timeOfSwitch = audio.currentTime;
  audio.src = bitrateSelector.value;
  audio.currentTime = timeOfSwitch;
  audio.play();
});

/////////////////////////////////////////////////////////////

subtitleSelector.addEventListener('change', () => {
  subtitleTrack.src = subtitleSelector.value;
  subtitleSelector.value ?
    subtitleContainer.classList.remove('hide') :
    subtitleContainer.classList.add('hide');
  parseTTML();
});

/////////////////////////////////////////////////////////////


if (getSaved('HLS'))
  switchHLS.toggleAttribute('checked');

switchHLS.addEventListener('click', () => {
  getSaved('HLS') ?
    removeSaved('HLS') :
    save('HLS', 'true');

});


/////////////////////////////////////////////////////////////

export default async function player(id: string | null = '') {

  if (!id) return;
  if (instanceSelector.selectedIndex === 0) return import('./player.invidious').then(pi => pi.default(id));

  playButton.classList.replace(playButton.className, 'ri-loader-3-line');

  const apiIndex = instanceSelector.selectedIndex;
  const apiUrl = getApi('piped', apiIndex);

  const data = await fetch(apiUrl + '/streams/' + id)
    .then(async res => {
      const response = res.json();
      if (!res.ok)
        throw new Error(
          (await response).message
        );
      return response;
    })
    .catch(err => {
      if (apiIndex < instanceSelector.length - 1) {
        notify(`switched playback instance from ${apiUrl} to ${getApi('piped', apiIndex + 1)} due to error: ${err.message}`);
        instanceSelector.selectedIndex++;
        player(id);
        return;
      }
      notify(err.message);
      playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
      instanceSelector.selectedIndex = 0;
    });


  if (!data && !data.hasOwnProperty('audioStreams'))
    return notify('No data found');



  const audioStreams = data.audioStreams
    .sort((a: { bitrate: number }, b: { bitrate: number }) => (a.bitrate - b.bitrate));

  const noOfBitrates = audioStreams.length;
  const hlsOn = switchHLS.hasAttribute('checked');

  if (!noOfBitrates && !hlsOn) {
    notify('NO AUDIO STREAMS AVAILABLE.');
    playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
    return;
  }

  const preferedCodec = codecSelector.value;
  let index = -1;

  bitrateSelector.innerHTML = '';
  const isMusic = data.category === 'Music';
  const ivApi = getApi('invidious');

  function proxyHandler(url: string) {

    const oldUrl = new URL(url);

    if (isMusic && hlsOn) return url;

    // only proxy music streams
    const host = isMusic ? ivApi : `https://${oldUrl.searchParams.get('host')}`;

    return url.replace(oldUrl.origin, host);
  }


  audioStreams.forEach((_: {
    codec: string,
    url: string,
    quality: string,
    bitrate: string,
    contentLength: number,
    mimeType: string
  }, i: number) => {
    const codec = _.codec === 'opus' ? 'opus' : 'aac';


    // add to DOM
    bitrateSelector.add(new Option(`${_.quality} ${codec} - ${(_.contentLength / (1024 * 1024)).toFixed(2)} MB`, proxyHandler(_.url)));

    (<HTMLOptionElement>bitrateSelector.lastElementChild).dataset.type = _.mimeType;
    // find preferred bitrate
    const codecPref = preferedCodec ? codec === preferedCodec : true;
    const hqPref = getSaved('hq') ? noOfBitrates : 0;
    if (codecPref && index < hqPref) index = i;
  });


  bitrateSelector.selectedIndex = index;

  if (hlsOn) {
    audio.src = '';
    hls.loadSource(proxyHandler(data.hls));
  } else
    audio.src = bitrateSelector.value;

  // Subtitle data dom injection

  for (const option of subtitleSelector.options)
    if (option.textContent !== 'Subtitles') option.remove();

  subtitleSelector.classList.remove('hide');
  subtitleContainer.innerHTML = '';

  if (data.subtitles.length)
    for (const subtitles of data.subtitles)
      subtitleSelector.add(
        new Option(subtitles.name, subtitles.url)
      );
  else {
    subtitleTrack.src = '';
    subtitleContainer.classList.add('hide');
    subtitleSelector.classList.add('hide');
    subtitleContainer.firstChild?.remove();
  }


  // remove ' - Topic' from name if it exists

  let music = false;
  if (data.uploader.endsWith(' - Topic')) {
    music = true;
    data.uploader = data.uploader.replace(' - Topic', '');
  }

  setMetaData(
    id,
    data.title,
    data.uploader,
    data.uploaderUrl,
    music
  );


  params.set('s', id);

  if (location.pathname === '/')
    history.replaceState({}, '', location.origin + '?s=' + params.get('s'));

  audio.dataset.id = id;
  audio.dataset.title = data.title;
  audio.dataset.author = data.uploader;
  audio.dataset.duration = convertSStoHHMMSS(data.duration);
  audio.dataset.channelUrl = data.uploaderUrl;


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
    autoQueue(data.relatedStreams);

  if (getSaved('discover') === 'off') return;

  // related streams data injection as discovery data after 10 seconds

  setTimeout(() => {
    if (id !== audio.dataset.id) return;

    const db = getDB();
    if (!db.hasOwnProperty('discover')) db.discover = {};
    data.relatedStreams.forEach(
      (stream: Recommendation) => {
        if (
          stream.type !== 'stream' ||
          stream.duration < 100 || stream.duration > 3000) return;

        const rsId = stream.url.slice(9);

        // merges previous discover items with current related streams
        db.discover.hasOwnProperty(rsId) ?
          (<number>db.discover[rsId].frequency)++ :
          db.discover[rsId] = {
            id: rsId,
            title: stream.title,
            author: stream.uploaderName,
            duration: convertSStoHHMMSS(stream.duration),
            channelUrl: stream.uploaderUrl,
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
    if (params.get('collection') === 'discover')
      document.getElementById('discover')!.click();


  }, 20000);
}
