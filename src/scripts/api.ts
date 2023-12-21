import { audio, pipedInstances, invidiousInstances, thumbnailProxies } from "../lib/dom";
import player from "../lib/player";
import { $, getSaved, imgUrl, save } from "../lib/utils";

type tree = Record<'invidious' | 'piped' | 'image' | 'selected', { [index: string]: string }>

const apiTree: tree = {
  invidious: {},
  piped: {},
  image: {},
  selected: {
    invidious: '',
    image: '',
    piped: ''
  }
}

const apiRefreshBtn = (<HTMLAnchorElement>document.getElementById('apiRefreshBtn'));

function injectApi(tree: tree) {

  if (tree.selected.inviduous) {

  }

  while (invidiousInstances.length > 1)
    invidiousInstances.lastElementChild?.remove();

  for (const name in tree.invidious) {

    const url = tree.invidious[name];
    invidiousInstances.add(new Option(name, url));
  }

  while (pipedInstances.length > 1)
    pipedInstances.lastElementChild?.remove();
  for (const name in tree.piped) {
    const url = tree.piped[name];
    if (url === 'https://pipedapi.kavin.rocks') continue;
    pipedInstances.add(new Option(name, url));
  }

  while (thumbnailProxies.length > 1)
    thumbnailProxies.lastElementChild?.remove();
  for (const _ in tree.image) {
    thumbnailProxies.add(new Option(_, tree.image[_]));
  }
}

const txtReplace = (init: string, now: string) => apiRefreshBtn.textContent = <string>(<string>apiRefreshBtn.textContent).replace(init, now);

async function fetchAPIdata(event: Event) {
  event?.preventDefault();

  txtReplace('Regenerate', ' 1% Generating');

  const pipData = await fetch('https://piped-instances.kavin.rocks')
    .then(res => res.json())
    .catch(e => alert('fetching piped instances failed with error : ' + e));


  txtReplace('1', '5');

  const invData = await fetch('https://api.invidious.io/instances.json')
    .then(res => res.json())
    .catch(e => alert('fetching invidious instances failed with error : ' + JSON.stringify(e)));

  txtReplace('5', '10');

  let c = 10;

  for await (const instance of pipData) {
    c += 2;
    txtReplace(`${c - 2}`, `${c}`)
    const name = instance.name + ' ' + instance.locations;
    const url = instance.api_url;
    const imgPrxy = instance.image_proxy_url;

    apiTree.piped[name] = url;

    // image proxy
    await (new Promise(async (res, rej) => {
      const testImg = new Image();

      testImg.onload = _ => testImg.width === 120 ?
        res(_) : rej(_);
      testImg.onerror = _ => rej(_);
      testImg.src = imgUrl('1SLr62VBBjw', 'default', imgPrxy);
    })).then(() => apiTree.image[name] = imgPrxy)
      .catch(e => console.log('loading thumbnail failed on ' + url + ' with error ' + JSON.stringify(e)));
  }


  for await (const _ of invData) {
    c += 2;
    txtReplace(`${c - 2}`, `${c}`);

    const url = _[1].uri;
    if (!_[1].cors || !_[1].api || _[1].type !== 'https') continue;
    const audioData = await fetch(url + '/api/v1/videos/tbnLqRW9Ef0?fields=adaptiveFormats').then(res => res.json());

    if (!audioData.hasOwnProperty('adaptiveFormats')) continue;

    const audioURL = audioData.adaptiveFormats
      .filter((_: { audioSampleRate: number }) => _.audioSampleRate === 48000)
      .sort((a: { bitrate: number }, b: { bitrate: number }) => a.bitrate - b.bitrate)[0].url;

    await (new Promise((res, rej) => {
      const audioElement = $('audio');
      audioElement.onloadedmetadata = _ => res(_);
      audioElement.onerror = _ => rej(_);
      audioElement.src =
        (audioURL).replace(new URL(audioURL).origin, url);
    })).then(() => apiTree.invidious[_[0] + ' ' + _[1].flag] = url)
      .catch(e => console.log('playing audio from ' + url + ' failed with error ' + JSON.stringify(e)));
  }
  save('apiTree', JSON.stringify(apiTree));
  injectApi(apiTree);

  txtReplace(c + '% Generating', 'Regenerate');

  alert('Instances successfully updated');
}

const savedTree = JSON.parse(<string>getSaved('apiTree'));


addEventListener('DOMContentLoaded', (e) => savedTree ? injectApi(savedTree) : fetchAPIdata(e));

apiRefreshBtn.addEventListener('click', fetchAPIdata);


// Instance Selector change event
[invidiousInstances, pipedInstances, thumbnailProxies].forEach((instances, i) => {
  instances.addEventListener('change', async () => {

    const type = i === 0 ? 'invidious' : i === 1 ? 'piped' : 'image';

    const instance = instances.options[instances.selectedIndex];
    const name = <string>instance.textContent;

    let url = instance.value;

    if (name.startsWith('Custom')) {
      url = <string>prompt('Enter the URL');
      if (!url) return;
      instance.value = url;
      const [_, dom, ain] = new URL(url).hostname.split('.');
      instance.textContent = 'Custom : ' + [dom, ain].join('.');
    }

    if (!name || !url) return;

    const savedData: tree = JSON.parse(<string>getSaved('apiTree'));

    savedData.selected[type] = name + ' | ' + url;
    save('apiTree', JSON.stringify(savedData));

    if (i) return;
    audio.pause();
    const timeOfSwitch = audio.currentTime;
    await player(audio.dataset.id);
    audio.currentTime = timeOfSwitch;
  });
});
