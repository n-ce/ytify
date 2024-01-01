import { audio, pipedInstances, invidiousInstances, thumbnailProxies } from "../lib/dom";
import player from "../lib/player";
import { $, getSaved, imgUrl, save } from "../lib/utils";

type saved = {
  [index: string]: {
    name: string,
    url: string,
    custom: boolean
  }
}

const apiRefreshBtn = (<HTMLAnchorElement>document.getElementById('apiRefreshBtn'));


const serialisedList = getSaved('apiList') || '{}';
if (serialisedList !== '{}') {
  const apiList = JSON.parse(serialisedList);
  const keys = Object.keys(apiList);

  [invidiousInstances, pipedInstances, thumbnailProxies].forEach((instance, i) => {
    const key = keys[i];
    const data = apiList[key];
    const name = data.name;
    const url = data.url;
    const custom = data.custom;
    if (custom) {
      const dom = instance.options[0];
      dom.value = url;
      dom.textContent = 'Custom : ' + name;
    }
    else instance.add(new Option(name, url, undefined, true));
  });
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

    pipedInstances.add(new Option(name, url));

    // image proxy
    await (new Promise(async (res, rej) => {
      const testImg = new Image();

      testImg.onload = _ => testImg.width === 120 ?
        res(_) : rej('load failure');

      testImg.onerror = e => rej(e + ' server failure');
      testImg.src = imgUrl('1SLr62VBBjw', 'default', imgPrxy);
    })).then(() => thumbnailProxies.add(new Option(name, imgPrxy)))
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


    const [, dom, ain] = instance[0].split('.');

    const instanceName = [dom, ain].join('.') + ' ' + instance[1].flag;

    await (new Promise((res, rej) => {
      const audioElement = $('audio');
      audioElement.onloadedmetadata = _ => res(_);
      audioElement.onerror = e => rej(e + ' response failure');

      audioElement.src =
        (audioURL).replace(new URL(audioURL).origin, url);
    }))
      .then(() => invidiousInstances.add(new Option(instanceName, url)))
      .catch(e => console.log('playing audio from ' + url + ' failed with error ' + JSON.stringify(e)));
  }

  txtReplace(c + '% Generating', 'Regenerate');

  alert('Instances successfully updated');
}


const apiAutoFetchSwitch = (<HTMLElement>document.getElementById('apiAutoFetchSwitch'));
apiAutoFetchSwitch.addEventListener('click', () => {
  getSaved('apiAutoFetch') ?
    localStorage.removeItem('apiAutoFetch') :
    save('apiAutoFetch', 'false');
})

getSaved('apiAutoFetch') ?
  apiAutoFetchSwitch.toggleAttribute('checked') :
  addEventListener('DOMContentLoaded', fetchAPIdata);

apiRefreshBtn.addEventListener('click', fetchAPIdata);


// Instance Selector change event
[invidiousInstances, pipedInstances, thumbnailProxies].forEach((instances, i) => {
  instances.addEventListener('change', async () => {

    const type = i === 0 ? 'invidious' : i === 1 ? 'piped' : 'image';

    const instance = instances.options[instances.selectedIndex];
    let name = <string>instance.textContent;
    let url = instance.value;
    const custom = name.startsWith('Custom');

    if (custom) {
      url = <string>prompt('Enter the URL');
      if (!url) return;
      instance.value = url;
      const [, dom, ain] = new URL(url).hostname.split('.');
      name = [dom, ain].join('.');
      instance.textContent = 'Custom : ' + name;
    }

    if (!name || !url) return;

    const savedData: saved = JSON.parse(<string>getSaved('apiList')) || { piped: {}, invidious: {}, image: {} };
    savedData[type].name = name;
    savedData[type].url = url;
    savedData[type].custom = custom;
    save('apiList', JSON.stringify(savedData));

    if (type === 'invidious') {
      audio.pause();
      const timeOfSwitch = audio.currentTime;
      await player(audio.dataset.id);
      audio.currentTime = timeOfSwitch;
    }
  });
});
