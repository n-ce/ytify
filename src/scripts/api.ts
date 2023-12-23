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

  while (invidiousInstances.length > 1)
    invidiousInstances.lastElementChild?.remove();
  const selectedinvidious = tree.selected.invidious.split('|');
  for (const name in tree.invidious) {
    const url = tree.invidious[name];
    invidiousInstances.add(new Option(name, url, undefined, url === selectedinvidious[1]));
  }
  if (!Object.values(tree.invidious).includes(selectedinvidious[1])) {
    const custom = invidiousInstances.options[0];
    custom.value = selectedinvidious[1];
    custom.textContent = (custom.textContent?.includes('Custom') ? '' : 'Custom : ') + selectedinvidious[0];
  }

  while (pipedInstances.length > 1)
    pipedInstances.lastElementChild?.remove();

  const selectedpiped = tree.selected.piped.split('|');
  for (const name in tree.piped) {
    const url = tree.piped[name];
    pipedInstances.add(new Option(name, url, undefined, url === selectedpiped[1]));
  }
  if (!Object.values(tree.piped).includes(selectedpiped[1])) {
    const custom = pipedInstances.options[0];
    custom.value = selectedpiped[1];
    custom.textContent = (custom.textContent?.includes('Custom') ? '' : 'Custom : ') + selectedpiped[0];
  }

  while (thumbnailProxies.length > 1)
    thumbnailProxies.lastElementChild?.remove();

  const selectedimage = tree.selected.image.split('|');
  for (const name in tree.image) {
    const url = tree.image[name];
    thumbnailProxies.add(new Option(name, url, undefined, url === selectedimage[1]));
  }

  if (!Object.values(tree.image).includes(selectedimage[1])) {
    const custom = thumbnailProxies.options[0];
    custom.value = selectedimage[1];
    custom.textContent = (custom.textContent?.includes('Custom') ? '' : 'Custom : ') + selectedimage[0];
  }

}

const txtReplace = (init: string, now: string) => apiRefreshBtn.textContent = <string>(<string>apiRefreshBtn.textContent).replace(init, now);

async function fetchAPIdata(event: Event) {
  event?.preventDefault();

  if (apiRefreshBtn.textContent?.includes('Generating')) {
    apiRefreshBtn.textContent = 'API Generation stopped';
    throw new Error('Generation was abruptly stopped');
  }
  else apiRefreshBtn.textContent = 'Regenerate Piped + Invidious Instances Data';

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
    txtReplace(`${c}`, `${c += 2}`);

    const name = instance.name + ' ' + instance.locations;
    const url = instance.api_url;
    const imgPrxy = instance.image_proxy_url;

    apiTree.piped[name] = url;

    // image proxy
    await (new Promise(async (res, rej) => {
      const testImg = new Image();

      testImg.onload = _ => testImg.width === 120 ?
        res(_) : rej('load failure');

      testImg.onerror = _ => rej('server failure');
      testImg.src = imgUrl('1SLr62VBBjw', 'default', imgPrxy);
    })).then(() => apiTree.image[name] = imgPrxy)
      .catch(e => console.log('loading thumbnail failed on ' + url + ' with error ' + JSON.stringify(e)));
  }


  for await (const instance of invData) {
    txtReplace(`${c}`, `${c += 2}`);

    const url = instance[1].uri;
    if (!instance[1].cors || !instance[1].api || instance[1].type !== 'https') continue;
    const audioData = await fetch(url + '/api/v1/videos/tbnLqRW9Ef0?fields=adaptiveFormats').then(res => res.json());

    if (!audioData.hasOwnProperty('adaptiveFormats')) continue;

    const audioURL = audioData.adaptiveFormats
      .filter((stream: { audioSampleRate: number }) => stream.audioSampleRate === 48000)
      .sort((a: { bitrate: number }, b: { bitrate: number }) => a.bitrate - b.bitrate)[0].url;


    const [_, dom, ain] = instance[0].split('.');

    const instanceName = [dom, ain].join('.') + ' ' + instance[1].flag;

    await (new Promise((res, rej) => {
      const audioElement = $('audio');
      audioElement.onloadedmetadata = _ => res(_);
      audioElement.onerror = _ => rej('response failure');

      audioElement.src =
        (audioURL).replace(new URL(audioURL).origin, url);
    })).then(() => apiTree.invidious[instanceName] = url)
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
    let name = <string>instance.textContent;
    let url = instance.value;

    if (name.startsWith('Custom')) {
      url = <string>prompt('Enter the URL');
      if (!url) return;
      instance.value = url;
      const [_, dom, ain] = new URL(url).hostname.split('.');
      name = instance.textContent = 'Custom : ' + [dom, ain].join('.');
    }

    if (!name || !url) return;

    const savedData: tree = JSON.parse(<string>getSaved('apiTree'));

    savedData.selected[type] = name + '|' + url;
    save('apiTree', JSON.stringify(savedData));

    if (i !== 0) return;
    audio.pause();
    const timeOfSwitch = audio.currentTime;
    await player(audio.dataset.id);
    audio.currentTime = timeOfSwitch;
  });
});
