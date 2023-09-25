import { audio, bitrateSelector, pipedInstances, playButton } from "./dom";
import { convertSStoHHMMSS, getSaved, itemsLoader, params, setMetaData } from "./utils";



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

  audio.dataset.seconds = '0';

  // extracting opus streams and storing m4a streams

  interface Opus {
    urls: string[],
    bitrates: number[]
  }
  interface M4A extends Opus {
    options: HTMLOptionElement[]
  }
  const opus: Opus = { urls: [], bitrates: [] }
  const m4a: M4A = { urls: [], bitrates: [], options: [] }

  const isSafari = navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') <= -1;

  bitrateSelector.innerHTML = '';

  for (const value of data.audioStreams) {
    if (value.codec === "opus") {
      if (isSafari) continue;
      opus.urls.push(value.url);
      opus.bitrates.push(parseInt(value.quality));
      bitrateSelector.add(new Option(value.quality, value.url));
    }
    else {
      m4a.urls.push(value.url);
      m4a.bitrates.push(parseInt(value.quality));
      isSafari ?
        bitrateSelector.add(new Option(value.quality, value.url)) :
        m4a.options.push(new Option(value.quality, value.url));
    }
  }

  // finding lowest available stream when low opus bitrate unavailable

  if (
    !getSaved('quality') &&
    Math.min(...opus.bitrates) > 64 &&
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


  // remove ' - topic' from name
  if (data.category === 'Music')
    data.uploader = data.uploader.slice(0, -8);

  setMetaData(
    id,
    data.thumbnailUrl,
    data.title,
    data.uploader,
    data.uploaderUrl
  );


  // load related streams
  const relatedStreamsContainer = <HTMLElement>document.getElementById('related');

  relatedStreamsContainer.innerHTML = '';
  relatedStreamsContainer.appendChild(itemsLoader(data.relatedStreams));

  // (<HTMLAnchorElement>document.getElementById('/')).click();
  params.set('s', id);
  // history.pushState({}, '', '?' + params);

  audio.dataset.id = id;
  audio.dataset.thumbnail = data.thumbnailUrl;
  audio.dataset.name = data.title;
  audio.dataset.author = data.uploader;
  audio.dataset.duration = convertSStoHHMMSS(data.duration);
}
