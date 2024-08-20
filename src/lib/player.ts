import { audio, favButton, favIcon, playButton, subtitleSelector, subtitleTrack, subtitleContainer, listAnchor, instanceSelector, bitrateSelector } from "./dom";
import { convertSStoHHMMSS, notify, parseTTML, setMetaData, getApi, goTo } from "./utils";
import { autoQueue } from "../scripts/audioEvents";
import { getDB, addListToCollection } from "./libraryUtils";
import { params, store, getSaved } from "../store";
import { fetchWithInvidious } from "../scripts/fetchWithInvidious";



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

/////////////////////////////////////////////////////////////

function setAudioStreams(audioStreams: {
  codec: string,
  url: string,
  quality: string,
  bitrate: string,
  contentLength: number,
  mimeType: string,
}[],
  isMusic = false,
  isLive = false,
  isCustomInstance = false) {

  const preferedCodec = store.player.codec;
  const noOfBitrates = audioStreams.length;
  let index = -1;

  if (!noOfBitrates) {
    notify(
      isLive ?
        'Turn on HLS to listen to LiveStreams!' :
        'No Audio Streams Found.'
    );
    playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
    return;
  }

  function proxyHandler(url: string) {
    const proxyViaPiped = isCustomInstance || (getSaved('proxyViaInvidious') === 'false');
    const useProxy = isMusic || getSaved('enforceProxy');

    // use the default proxy url
    if (proxyViaPiped && useProxy) return url;

    const oldUrl = new URL(url);

    const host = useProxy ? getApi('invidious') : `https://${oldUrl.searchParams.get('host')}`;

    return url.replace(oldUrl.origin, host);
  }

  bitrateSelector.innerHTML = '';
  audioStreams.forEach((_, i: number) => {
    const codec = _.codec === 'opus' ? 'opus' : 'aac';
    const size = (_.contentLength / (1024 * 1024)).toFixed(2) + ' MB';

    // add to DOM
    bitrateSelector.add(new Option(`${_.quality} ${codec} - ${size}`, proxyHandler(_.url)));

    (<HTMLOptionElement>bitrateSelector?.lastElementChild).dataset.type = _.mimeType;
    // find preferred bitrate
    const codecPref = preferedCodec ? codec === preferedCodec : true;
    const hqPref = store.player.hq ? noOfBitrates : 0;
    if (codecPref && index < hqPref) index = i;
  });


  bitrateSelector.selectedIndex = index;
  audio.src = bitrateSelector.value;
}

function setSubtitles(subtitles: Record<'name' | 'url', string>[]) {

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

export default async function player(id: string | null = '') {

  if (!id) return;

  playButton.classList.replace(playButton.className, 'ri-loader-3-line');

  const apiIndex = instanceSelector.selectedIndex;
  const fetchViaIV = getSaved('fetchViaIV');
  const apiUrl = store.api[apiIndex][fetchViaIV ? 'invidious' : 'piped'];
  const fetchWithPiped = (id: string) =>
    fetch(apiUrl + '/streams/' + id)
      .then(res => res.json())
      .then(res => {
        if ('error' in res)
          throw new Error(res.error)
        else return res;
      });

  const data = await (
    fetchViaIV ?
      fetchWithInvidious(id, apiUrl) :
      fetchWithPiped(id)
  ).catch(err => {
    if (apiIndex < instanceSelector.length - 1) {
      notify(`switched instance from ${apiUrl} to ${getApi(fetchViaIV ? 'invidious' : 'piped', apiIndex + 1)} due to error: ${err.message}`);
      instanceSelector.selectedIndex++;
      player(id);
      return;
    }
    notify(err.message);
    playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
    instanceSelector.selectedIndex = 1;
  });

  if (!data) return;

  store.stream.id = id;
  store.stream.title = data.title;
  store.stream.author = data.uploader;
  store.stream.duration = convertSStoHHMMSS(data.duration);
  store.stream.channelUrl = data.uploaderUrl;


  setMetaData(store.stream);

  const h = store.player.HLS;
  h ?
    h.loadSource(data.hls) :
    setAudioStreams(
      data.audioStreams.sort(
        (a: { bitrate: number }, b: { bitrate: number }) => (a.bitrate - b.bitrate)
      ),
      data.category === 'Music',
      data.livestream,
      apiIndex === 0
    );

  setSubtitles(data.subtitles || '');


  params.set('s', id);

  if (location.pathname === '/')
    history.replaceState({}, '', location.origin + '?s=' + params.get('s'));


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


  if (getSaved('autoQueue') === 'on')
    autoQueue(data.relatedStreams);

  if (getSaved('discover') === 'off') return;

  // related streams data injection as discovery data after 10 seconds

  setTimeout(() => {
    if (id !== store.stream.id) return;

    const db = getDB();
    if (!db.hasOwnProperty('discover')) db.discover = {};
    data.relatedStreams?.forEach(
      (stream: StreamItem) => {
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
    if (listAnchor.classList.contains('view') && params.get('collection') === 'discover')
      goTo('discover');


  }, 20000);
}
