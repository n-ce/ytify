import { addToCollection } from "../scripts/library";
import { audio, bitrateSelector, pipedInstances, playButton, subtitleContainer, subtitleSelector, subtitleTrack } from "./dom";
import { convertSStoHHMMSS, getCollection, getDB, getSaved, params, parseTTML, saveDB, setMetaData } from "./utils";

const isSafari = navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') <= -1;


export default async function player(id: string | null = '') {

  if (!id) return;

  playButton.classList.replace(playButton.className, 'ri-loader-3-line');

  const data = await fetch(pipedInstances.value + '/streams/' + id).then(res => res.json()).catch(err => {
    if (pipedInstances.selectedIndex < pipedInstances.length - 1) {
      pipedInstances.selectedIndex++;
      player(id);
      return;
    }
    alert(err);
    pipedInstances.selectedIndex = 0;
  });

  if (!data.audioStreams.length) {
    alert('NO AUDIO STREAMS AVAILABLE.');
    return;
  }


  // extracting opus streams and storing m4a streams

  const opus: Opus = { urls: [], bitrates: [] }
  const m4a: M4A = { urls: [], bitrates: [], options: [] }


  bitrateSelector.innerHTML = '';

  for (const value of data.audioStreams) {
    if (value.codec === "opus") {
      if (isSafari) continue;
      opus.urls.push(value.url);
      opus.bitrates.push(value.bitrate);
      bitrateSelector.add(new Option(value.quality, value.url));
    }
    else {
      m4a.urls.push(value.url);
      m4a.bitrates.push(value.bitrate);
      isSafari ?
        bitrateSelector.add(new Option(value.quality, value.url)) :
        m4a.options.push(new Option(value.quality, value.url));
    }
  }

  // finding lowest available stream when low opus bitrate unavailable

  if (
    !getSaved('quality') &&
    Math.min(...opus.bitrates) > 65536 &&
    !isSafari) {

    opus.urls = opus.urls.concat(m4a.urls);

    opus.bitrates = opus.bitrates.concat(m4a.bitrates);

    for (const opts of m4a.options) bitrateSelector.add(opts);
  }

  const codec = (isSafari ? m4a : opus);

  bitrateSelector.selectedIndex =
    codec.bitrates.indexOf(
      getSaved('quality') ?
        Math.max(...codec.bitrates) :
        Math.min(...codec.bitrates)
    );

  audio.src = codec.urls[bitrateSelector.selectedIndex];



  // remove ' - Topic' from name if it exists
  data.uploader = data.uploader.replace(' - Topic', '');

  setMetaData(
    id,
    data.title,
    data.uploader,
    data.uploaderUrl,
    data.thumbnailUrl
  );


  // Subtitle data Injection into dom

  subtitleSelector.innerHTML = '<option value="">Subtitles</option>';
  subtitleSelector.classList.remove('hide');
  subtitleContainer.innerHTML = '';
  if (data.subtitles.length)
    for (const subtitles of data.subtitles) subtitleSelector.add(new Option(subtitles.name, subtitles.url));
  else {
    subtitleTrack.src = '';
    subtitleContainer.classList.add('hide');
    subtitleSelector.classList.add('hide');
    parseTTML();
  }


  params.set('s', id);

  if (location.pathname === '/')
    history.replaceState({}, '', location.origin + '?s=' + params.get('s'));

  audio.dataset.id = id;
  audio.dataset.thumbnail = data.thumbnailUrl;
  audio.dataset.name = data.title;
  audio.dataset.author = data.uploader;
  audio.dataset.duration = convertSStoHHMMSS(data.duration);
  audio.dataset.channelUrl = data.uploaderUrl;


  // reset fav button state


  // load related streams into discovery data

  setTimeout(() => {
    getCollection('discover').innerHTML =
      `<summary>
          <i class="ri-compass-3-line"></i> Discover
        </summary>`;
    const db = getDB();

    data.relatedStreams
      .filter((stream: StreamItem) => stream.type === 'stream')
      .forEach((stream: StreamItem) => {
        const id = stream.url.slice(9);
        if (db.discover.hasOwnProperty(id))
          (<number>db.discover[id].frequency)++;
        else
          db.discover[id] = {
            id: id,
            title: stream.title,
            thumbnail: stream.thumbnailUrl,
            author: stream.uploaderName,
            duration: convertSStoHHMMSS(stream.duration),
            channelUrl: stream.uploaderUrl,
            frequency: 1
          }
      });

    const sortedArray = Object.entries(db.discover).sort((a, b) => <number>a[1].frequency - <number>b[1].frequency)

    db.discover = {};

    sortedArray.forEach(i => {
      db.discover[i[0]] = i[1];
      addToCollection('discover', i[1])
    });

    saveDB(db);

  }, 1e4);
}
