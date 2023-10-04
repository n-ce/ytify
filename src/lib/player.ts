import { audio, bitrateSelector, pipedInstances, playButton, subtitleContainer, subtitleSelector, subtitleTrack } from "./dom";
import { convertSStoHHMMSS, getSaved, itemsLoader, params, parseTTML, setMetaData } from "./utils";

const isSafari = navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') <= -1;

interface Opus {
  urls: string[],
  bitrates: number[]
}
interface M4A extends Opus {
  options: HTMLOptionElement[]
}

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
    data.thumbnailUrl,
    data.title,
    data.uploader,
    data.uploaderUrl
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


  // load related streams
  const relatedStreamsContainer = <HTMLElement>document.getElementById('related');

  relatedStreamsContainer.innerHTML = '';
  relatedStreamsContainer.appendChild(itemsLoader(data.relatedStreams));


  params.set('s', id);

  if (location.pathname === '/')
    history.replaceState({}, '', location.origin + '?s=' + params.get('s'));

  audio.dataset.id = id;
  audio.dataset.thumbnail = data.thumbnailUrl;
  audio.dataset.name = data.title;
  audio.dataset.author = data.uploader;
  audio.dataset.duration = convertSStoHHMMSS(data.duration);
}
