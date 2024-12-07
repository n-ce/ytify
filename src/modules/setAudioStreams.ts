import { audio, bitrateSelector, playButton } from "../lib/dom";
import { getSaved, store } from "../lib/store";
import { notify } from "../lib/utils";

export function setAudioStreams(audioStreams: {
  codec: string,
  url: string,
  quality: string,
  bitrate: string,
  contentLength: number,
  mimeType: string
}[],
  isMusic = false,
  isLive = false) {

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
    const useProxy = isMusic || getSaved('enforceProxy');
    const oldUrl = new URL(url);
    const origin = oldUrl.origin;
    
    if (url.startsWith('https://ymd'))
      return url;
    
    if (url.startsWith('https://r'))
      return url.replace(origin, store.player.proxy) + '&host=' + origin.slice(8);

    return url.replace(origin,
      useProxy ?
        (store.api.index < store.api.unified ? store.api.invidious[store.api.index] : origin ) : 'https://redirector.googlevideo.com'
    );

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
