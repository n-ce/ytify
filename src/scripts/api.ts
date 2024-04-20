import { audio, pipedInstances, invidiousInstances, thumbnailProxies, unifiedInstances } from "../lib/dom";
import player from "../lib/player";
import { getSaved, generateImageUrl, notify, removeSaved, save, supportsOpus } from "../lib/utils";


const defData: apiList = {
  'piped': {
    name: 'kavin.rocks 🌐',
    url: 'https://pipedapi.kavin.rocks',
    custom: false
  },
  'invidious': {
    name: 'fdn.fr 🇫🇷',
    url: 'https://invidious.fdn.fr',
    custom: false
  },
  'image': {
    name: 'lunar.icu 🇩🇪',
    url: 'https://piped-proxy.lunar.icu',
    custom: false
  }
};


const clone = JSON.stringify(defData);
const iMap = { 'piped': pipedInstances, 'invidious': invidiousInstances, 'image': thumbnailProxies };
const apiRefreshBtn = <HTMLButtonElement>document.getElementById('apiRefreshBtn');
const serialisedList = getSaved('apiList_2') || '{}';

if (serialisedList !== '{}') {
  const apiList = JSON.parse(serialisedList);

  Object.entries(iMap).forEach(array => {
    const [key, instance] = array;
    instance.lastChild?.remove();
    const data = apiList[key];
    const name = data.name;
    const url = data.url;
    const custom = data.custom;
    if (name === 'kavin.rocks 🌐' || name === 'lunar.icu 🇩🇪' || name === 'fdn.fr 🇫🇷') return;
    if (custom) {
      const dom = instance.options[0];
      dom.value = url;
      dom.textContent = 'Custom : ' + name;
      dom.selected = true;
    }
    else instance.add(new Option(name, url, undefined, true));
  });
}


async function fetchAPIdata() {

  const startTime = performance.now();
  const wordReplace = (init: string, now: string) => apiRefreshBtn.textContent = <string>(<string>apiRefreshBtn.textContent).replace(init, now);

  if (apiRefreshBtn.textContent?.includes('Generating')) {
    apiRefreshBtn.textContent = 'Instances Generation Stopped';
    throw new Error('Generation was abruptly stopped');
  }
  else apiRefreshBtn.textContent = 'Regenerate Instances';

  wordReplace('Regenerate', ' 0% Generating');

  const pipData = await fetch('https://piped-instances.kavin.rocks')
    .then(res => res.json())
    .catch(e => {
      const error = `Fetching piped instances failed with error : ${JSON.stringify(e.message)}`;
      notify(error);
      apiRefreshBtn.textContent = error;
    });

  let dataUsage = (new Blob([JSON.stringify(pipData)])).size;

  const invData = await fetch('https://i2-a.vercel.app')
    .then(res => res.json())
    .catch(e => {
      const error = 'Fetching invidious instances failed with error : ' + JSON.stringify(e.message);
      notify(error);
      apiRefreshBtn.textContent = error;
    });

  dataUsage += (new Blob([JSON.stringify(invData)])).size;

  const rate = 100 / (pipData?.length + invData?.length);
  let num = 0;
  let temp;

  for await (const instance of pipData) {
    temp = num.toFixed();
    num += rate;
    wordReplace(temp, num.toFixed());

    const name = instance.name + ' ' + instance.locations;
    const url = instance.api_url;
    const imgPrxy = instance.image_proxy_url;

    if (![...pipedInstances.options].map(_ => _.value).includes(url))
      pipedInstances.add(new Option(name, url));

    // image proxy
    await (new Promise(async (res, rej) => {
      const testImg = new Image();

      testImg.onload = () => testImg.width === 120 ?
        res(dataUsage += 82) : rej('Failed to load');

      testImg.onerror = () => rej('Failed to load');
      testImg.src = generateImageUrl('1SLr62VBBjw', 'default', imgPrxy);
    })).then(() => {
      if (![...thumbnailProxies.options].map(_ => _.value).includes(imgPrxy))
        thumbnailProxies.add(new Option(name, imgPrxy))
    })
      .catch(e => console.log(`${e} thumbnail via ${imgPrxy}`));
  }

  const [audioSize, audioFormat] = await supportsOpus() ? [457, 1] : [7331, 0];

  const getAudioURL = (index = 2): Promise<string> => fetch(pipedInstances.options[index].value + '/streams/NwmIu9iPkR0')
    .then(res => res.json())
    .then(json => {
      dataUsage += (new Blob([JSON.stringify(json)])).size;
      return json.audioStreams[audioFormat].url;
    })
    .catch((e: string) => {
      console.log(`Failed to fetch audio test data via ${pipedInstances.options[index].value}: ${e}`);
      return getAudioURL(index + 1);
    });
  const audioURL = await getAudioURL();

  for await (const instance of invData) {
    temp = num.toFixed();
    num += rate;
    wordReplace(temp, num.toFixed());

    const [instanceName, url] = instance.split(',');

    await (new Promise((res, rej) => {

      const audioElement = new Audio();

      audioElement.onloadedmetadata = () => res(dataUsage += audioSize);
      audioElement.onerror = () => rej('Failed to play audio');
      audioElement.src = audioURL.replace(new URL(audioURL).origin, url);

    }))
      .then(() => {
        if (![...invidiousInstances.options].map(_ => _.value).includes(url))
          invidiousInstances.add(new Option(instanceName, url))
      })
      .catch(e => console.log(`${e} via ${url}`));
  }

  wordReplace('100% Generating', 'Regenerate');

  const timeTaken = ((performance.now() - startTime) / 1000);

  notify(`Instances successfully added in ${Math.ceil(timeTaken)} seconds, ${Math.ceil(dataUsage / 1024)}KB data was used.`);

}


const apiAutoFetchSwitch = <HTMLElement>document.getElementById('apiAutoFetchSwitch');

// Unified Instance Architechture

if (getSaved('unifiedInstance') !== 'disabled') {

  removeSaved('apiList_2');
  removeSaved('apiAutoFetch');

  apiRefreshBtn.remove();
  apiAutoFetchSwitch.remove();

  const unifiedInstancesAPIurl = 'https://raw.githubusercontent.com/wiki/n-ce/ytify/unified_instances.md';

  fetch(unifiedInstancesAPIurl)
    .then(res => res.text())
    .then(text => JSON.parse(text.slice(3)))
    .then((json) => {

      let average = 0;

      const tzar = (<{ [index: string]: string }[]>Object.values(json)).map((i) => parseInt(i.timezone.slice(3)));

      for (const i of tzar)
        average += i

      const tzmy = new Date().getTimezoneOffset() / 60;

      if (average < tzmy) {

        const reversedKeys = Object.keys(json).reverse();

        const reversedObject: typeof json = {};
        for (const key of reversedKeys)
          reversedObject[key] = json[key];

        json = reversedObject;
      }

      for (const type in iMap)
        iMap[type as keyof typeof iMap].innerHTML = '';

      for (const data in json) {
        delete json[data].timezone;

        unifiedInstances.add(new Option(data));

        const iData = json[data];

        for (const newMap in iData)
          iMap[newMap as keyof typeof iMap].add(new Option(data, iData[newMap]));

      }
    })
    .then(() => {

      unifiedInstances.addEventListener('change', () => {
        const selected = `${unifiedInstances.selectedIndex || 'disabled'}`;

        selected === '1' ?
          removeSaved('unifiedInstance') :
          save('unifiedInstance', selected);

        if (selected === 'disabled') location.reload();

        [pipedInstances, invidiousInstances, thumbnailProxies].forEach(
          i =>
            i.selectedIndex = unifiedInstances.selectedIndex - 1
        )
      });

      const index = parseInt(getSaved('unifiedInstance') || '1');

      unifiedInstances.selectedIndex = index;

      unifiedInstances.dispatchEvent(new Event('change'));
    });

} else {
  // Classic Instance Architechture

  apiAutoFetchSwitch.addEventListener('click', () => {
    getSaved('apiAutoFetch') ?
      removeSaved('apiAutoFetch') :
      save('apiAutoFetch', 'false');
  });

  getSaved('apiAutoFetch') ?
    apiAutoFetchSwitch.toggleAttribute('checked') :
    addEventListener('DOMContentLoaded', fetchAPIdata);

  apiRefreshBtn.addEventListener('click', fetchAPIdata);

}

// Instance Selector change event
Object.entries(iMap).forEach(array => {
  const [type, instance] = array;
  instance.addEventListener('change', async () => {

    const selectedOption = instance.options[instance.selectedIndex];
    let name = <string>selectedOption.textContent;
    let url = selectedOption.value;
    const custom = name.startsWith('Custom');

    if (custom) {
      url = <string>prompt(`Enter the ${type} instance URL such as ${instance.options[1].value}`);
      if (!url) return;
      selectedOption.value = url;
      const [, dom, ain] = new URL(url).hostname.split('.');
      name = [dom, ain].join('.');
      selectedOption.textContent = 'Custom : ' + name;
    }

    if (!name || !url) return;

    const savedData: apiList = JSON.parse(<string>getSaved('apiList_2')) || defData;

    savedData[type].name = name;
    savedData[type].url = url;
    savedData[type].custom = custom;

    let listIsSame = true;
    const parsedClone = JSON.parse(clone);
    for (const type in parsedClone)
      if (savedData[type].url !== parsedClone[type].url)
        listIsSame = false;

    listIsSame ?
      removeSaved('apiList_2') :
      save('apiList_2', JSON.stringify(savedData));


    if (type === 'invidious') {
      audio.pause();
      const timeOfSwitch = audio.currentTime;
      await player(audio.dataset.id);
      audio.currentTime = timeOfSwitch;
    }
  });
});
