import { audio, pipedInstances, invidiousInstances, thumbnailProxies } from "../lib/dom";
import player from "../lib/player";
import { getSaved, imgUrl, notify, save } from "../lib/utils";

const defData: apiList = {
  'piped': {
    name: 'kavin.rocks',
    url: 'https://pipedapi.kavin.rocks',
    custom: false
  },
  'invidious': {
    name: 'fdn.fr',
    url: 'https://invidious.fdn.fr',
    custom: false
  },
  'image': {
    name: 'r4fo.com',
    url: 'https://pipedproxy.r4fo.com',
    custom: false
  }
};
const clone = JSON.stringify(defData);
const iMap = { 'piped': pipedInstances, 'invidious': invidiousInstances, 'image': thumbnailProxies };
const apiRefreshBtn = (<HTMLAnchorElement>document.getElementById('apiRefreshBtn'));
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
    if (name === 'kavin.rocks' || name === 'r4fo.com' || name === 'fdn.fr') return;
    if (custom) {
      const dom = instance.options[0];
      dom.value = url;
      dom.textContent = 'Custom : ' + name;
      dom.selected = true;
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
  else apiRefreshBtn.textContent = 'Regenerate Instances';

  txtReplace('Regenerate', ' 0% Generating');

  const pipData = await fetch('https://piped-instances.kavin.rocks')
    .then(res => res.json())
    .catch(e => notify('fetching piped instances failed with error : ' + JSON.stringify(e.message)));

  const invData = await fetch('https://api.invidious.io/instances.json')
    .then(res => res.json())
    .catch(e => notify('fetching invidious instances failed with error : ' + JSON.stringify(e.message)));

  const rate = 100 / (pipData.length + invData.length);
  let num = 0;
  let temp;

  for await (const instance of pipData) {
    temp = num.toFixed();
    num += rate;
    txtReplace(temp, num.toFixed());

    const name = instance.name + ' ' + instance.locations;
    const url = instance.api_url;
    const imgPrxy = instance.image_proxy_url;

    if (![...pipedInstances.options].map(_ => _.value).includes(url))
      pipedInstances.add(new Option(name, url));

    // image proxy
    await (new Promise(async (res, rej) => {
      const testImg = new Image();

      testImg.onload = _ => testImg.width === 120 ?
        res(_) : rej('load failure');

      testImg.onerror = e => rej(e + ' server failure');
      testImg.src = imgUrl('1SLr62VBBjw', 'default', imgPrxy);
    })).then(() => {
      if (![...thumbnailProxies.options].map(_ => _.value).includes(imgPrxy))
        thumbnailProxies.add(new Option(name, imgPrxy))
    })
      .catch(e => console.log('loading thumbnail failed on ' + imgPrxy + ' with error ' + e));
  }


  for await (const instance of invData) {
    temp = num.toFixed();
    num += rate;
    txtReplace(temp, num.toFixed())

    const url = instance[1].uri;
    if (!instance[1].cors || !instance[1].api || instance[1].type !== 'https') continue;
    const audioData = await fetch(url + '/api/v1/videos/tbnLqRW9Ef0?fields=adaptiveFormats').then(res => res.json()).catch(e => console.log('failed to fetch audio data on' + url + 'with error: ' + JSON.stringify(e.message)));

    if (!audioData) continue;

    const audioURL = audioData.adaptiveFormats
      .filter((stream: { audioSampleRate: number }) => stream.audioSampleRate === 48000)
      .sort((a: { bitrate: number }, b: { bitrate: number }) => a.bitrate - b.bitrate)[0].url;


    const [, dom, ain] = instance[0].split('.');

    const instanceName = [dom, ain].join('.') + ' ' + instance[1].flag;

    await (new Promise((res, rej) => {
      const audioElement = new Audio();
      audioElement.onloadedmetadata = _ => res(_);
      audioElement.onerror = e => rej(e + ' response failure');

      audioElement.src =
        (audioURL).replace(new URL(audioURL).origin, url);
    }))
      .then(() => {
        if (![...invidiousInstances.options].map(_ => _.value).includes(url))
          invidiousInstances.add(new Option(instanceName, url))
      })
      .catch(e => console.log('playing audio from ' + url + ' failed with error ' + e));
  }

  txtReplace('100% Generating', 'Regenerate');

  notify('Instances successfully added');
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
Object.entries(iMap).forEach(array => {
  const [type, instance] = array;
  instance.addEventListener('change', async () => {

    const selectedOption = instance.options[instance.selectedIndex];
    let name = <string>selectedOption.textContent;
    let url = selectedOption.value;
    const custom = name.startsWith('Custom');

    if (custom) {
      url = <string>prompt('Enter the URL');
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
      localStorage.removeItem('apiList_2') :
      save('apiList_2', JSON.stringify(savedData));


    if (type === 'invidious') {
      audio.pause();
      const timeOfSwitch = audio.currentTime;
      await player(audio.dataset.id);
      audio.currentTime = timeOfSwitch;
    }
  });
});
