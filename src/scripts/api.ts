import { audio, pipedInstances } from "../lib/dom";
import player from "../lib/player";
import { $, getSaved, imgUrl, save } from "../lib/utils";

const apiTree: { [index: string]: { [index: string]: string } } = {
  playback: {
    'Default': 'https://invidious.fdn.fr'
  },
  search: {
    'Default': 'https://pipedapi.kavin.rocks'
  },
  thumbnail: {
    'Default': 'https://pipedproxy.kavin.rocks'
  },
  radio: {
    'Default': 'https://pipedapi.kavin.rocks'
  },
}

const apiRefreshBtn = <HTMLButtonElement>document.getElementById('apiRefreshBtn');


async function fetchAPIdata() {
  alert('Standby...Generating API Base, This may take some time.');

  const pipedUrl = 'https://piped-instances.kavin.rocks';
  const invidiousUrl = 'https://api.invidious.io/instances.json';

  const pipData = await fetch(pipedUrl).then(res => res.json());

  for await (const instance of pipData) {
    const name = instance.name + ' ' + instance.locations;
    const url = instance.api_url;
    const imgPrxy = instance.image_proxy_url;

    // search
    await fetch(url + '/search?q=Q86fth&filter=all')
      .then(res => res.json())
      .then(() => apiTree.search[name] = url)

    // thumbnail
    const testImg = new Image();
    testImg.onload = () => apiTree.thumbnail[name] = imgPrxy;
    testImg.src = imgUrl('1SLr62VBBjw', 'default');

    // mix radio
    await fetch(url + '/playlists/RDRgKAFK5djSk')
      .then(res => res.ok ? (apiTree.radio[name] = url) : fetch(url + '/playlists/RDRgKAFK5djSk').then(res => res.ok ? (apiTree.radio[name] = url) : ''))
  }
  const invData = await fetch(invidiousUrl).then(res => res.json());

  for await (const _ of invData) {
    const url = _[1].uri;
    if (!_[1].cors || !_[1].api || _[1].type !== 'https') return;
    const audioData = await fetch(url + '/api/v1/videos/tbnLqRW9Ef0?fields=adaptiveFormats').then(res => res.json());
    const audioElement = $('audio');
    const audioURL = (audioData.adaptiveFormats
      .filter((_: { audioSampleRate: number }) => _.audioSampleRate === 48000)
      .sort((a: { bitrate: number }, b: { bitrate: number }) => a.bitrate - b.bitrate))[0].url;

    audioElement.onloadedmetadata = () => apiTree.playback[_[0] + ' ' + _[1].flag] = url;
    audioElement.src = audioURL;

    (<HTMLSelectElement>document.getElementById('playbackInstance')).add(new Option(_[0] + ' ' + _[1].flag, url));
  }
}



apiRefreshBtn.addEventListener('click', fetchAPIdata);


const defURL = 'https://pipedapi.kavin.rocks';
const [initial_name, initial_url] = getSaved('pipedInstance')?.split('|') || ['kavin.rocks (Official) 🌐', defURL];

if (initial_name.includes('Custom')) {
  pipedInstances.options[0].value = initial_url;
  pipedInstances.options[0].textContent += ' : ' + new URL(initial_url).hostname;
} else pipedInstances.add(new Option(initial_name, initial_url, undefined, true));


// fetches list and falls back to saved previous list if not available

addEventListener('DOMContentLoaded', async () => {
  (await fetch('https://piped-instances.kavin.rocks')
    .then(res => res.json())
    .then(data => {
      save('apiList', JSON.stringify(data));
      return data;
    })
    .catch(() => JSON.parse(getSaved('apiList') || '[]')))
    .forEach((instance: Record<'api_url' | 'name' | 'locations' | 'image_proxy_url', string>) => {
      const name = instance.name + ' ' + instance.locations;
      if (initial_url !== instance.api_url)
        pipedInstances.add(new Option(name, instance.api_url));
    });
});

// Instance Selector change event

pipedInstances.addEventListener('change', async () => {
  const instance = pipedInstances.options[pipedInstances.selectedIndex];
  const name = <string>instance.textContent;
  if (name.includes('Custom')) {
    const url = prompt('Enter the URL');
    if (!url) return;
    instance.value = url;
    instance.textContent += ' : ' + new URL(url).hostname;
  }
  const url = instance.value;
  if (name && url)
    save('pipedInstance', name + '|' + url);
  if (url === defURL)
    localStorage.removeItem('pipedInstance');
  audio.pause();
  const timeOfSwitch = audio.currentTime;
  await player(audio.dataset.id);
  audio.currentTime = timeOfSwitch;
});
