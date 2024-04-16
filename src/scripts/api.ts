import { audio, pipedInstances, invidiousInstances, thumbnailProxies } from "../lib/dom";
import player from "../lib/player";
import { getSaved, generateImageUrl, notify, removeSaved, save } from "../lib/utils";


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
    name: 'leptons.xyz 🇦🇹',
    url: 'https://pipedproxy.leptons.xyz',
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
    if (key === 'piped' && name === 'kavin.rocks 🌐') return;
    if (key === 'image' && name === 'leptons.xyz 🇦🇹') return;
    if (key === 'invidious' && name === 'fdn.fr 🇫🇷') return;
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

async function fetchAPIdata() {

  if (apiRefreshBtn.textContent?.includes('Generating')) {
    apiRefreshBtn.textContent = 'Instances Generation Stopped';
    throw new Error('Generation was abruptly stopped');
  }
  else apiRefreshBtn.textContent = 'Regenerate Instances';

  txtReplace('Regenerate', ' 0% Generating');

  const pipData = await fetch('https://piped-instances.kavin.rocks')
    .then(res => res.json())
    .catch(e => {
      const error = `Fetching piped instances failed with error : ${JSON.stringify(e.message)}`;
      notify(error);
      apiRefreshBtn.textContent = error;
    });

  let dataUsage = (new Blob([JSON.stringify(pipData)])).size / 1024;

  const invData = await fetch('https://api.invidious.io/instances.json')
    .then(res => res.json())
    .catch(e => {
      const error = 'fetching invidious instances failed with error : ' + JSON.stringify(e.message);
      notify(error);
      apiRefreshBtn.textContent = error;
    });

  dataUsage += (new Blob([JSON.stringify(invData)])).size / 1024;

  const rate = 100 / (pipData?.length + invData?.length);
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

      testImg.onload = () => testImg.width === 120 ?
        res(dataUsage += 0.08) : rej('load failure');

      testImg.onerror = () => rej('server failure');
      testImg.src = generateImageUrl('1SLr62VBBjw', 'default', imgPrxy);
    })).then(() => {
      if (![...thumbnailProxies.options].map(_ => _.value).includes(imgPrxy))
        thumbnailProxies.add(new Option(name, imgPrxy))
    })
      .catch(() => console.log(`Loading thumbnail via ${imgPrxy} failed`));
  }

  for await (const instance of invData) {
    temp = num.toFixed();
    num += rate;
    txtReplace(temp, num.toFixed())

    if (!instance[1].cors || !instance[1].api || instance[1].type !== 'https') continue;

    const [, dom, ain] = instance[0].split('.');
    const instanceName = [dom, ain].join('.') + ' ' + instance[1].flag;
    const url = instance[1].uri;

    const audioData = await fetch(url + '/api/v1/videos/NwmIu9iPkR0').then(res => res.json()).catch(() => console.log('Failed to fetch Audio data via ' + url));

    if (!audioData || !audioData.adaptiveFormats) continue;

    dataUsage += (new Blob([JSON.stringify(audioData)])).size / 1024;

    const audioURL = audioData.adaptiveFormats[0].url;

    await (new Promise((res, rej) => {
      const audioElement = new Audio();
      audioElement.onloadedmetadata = () => res(dataUsage += 3.53);
      audioElement.onerror = () => rej('response failure');

      audioElement.src = audioURL.replace(new URL(audioURL).origin, url);
    }))
      .then(() => {
        if (![...invidiousInstances.options].map(_ => _.value).includes(url))
          invidiousInstances.add(new Option(instanceName, url))
      })
      .catch(e => console.log(`${e} when playing audio via ${url}`));
  }

  txtReplace('100% Generating', 'Regenerate');

  notify(`Instances successfully added. ${Math.ceil(dataUsage)}KB data was used.`);
}


const apiAutoFetchSwitch = <HTMLElement>document.getElementById('apiAutoFetchSwitch');
apiAutoFetchSwitch.addEventListener('click', () => {
  getSaved('apiAutoFetch') ?
    removeSaved('apiAutoFetch') :
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
