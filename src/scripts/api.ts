import { audio, instanceSelector } from "../lib/dom";
import player from "../lib/player";
import { getSaved, removeSaved, save } from "../lib/utils";
import { store } from "../store";


const hlsOn = store.player.HLS;

const instanceAPIurl = hlsOn ? 'https://piped-instances.kavin.rocks' : 'https://raw.githubusercontent.com/wiki/n-ce/ytify/UnifiedInstances_v2B.md';

fetch(instanceAPIurl)
  .then(res => hlsOn ? res.json() : res.text())
  .then(text => {

    const json = hlsOn ?
      text.map((v: Record<'name' | 'locations' | 'api_url' | 'image_proxy_url', string>) => ({
        name: `${v.name} ${v.locations}`,
        piped: v.api_url,
        invidious: 'https://invidious.fdn.fr'
      })) :
      JSON.parse(text.slice(3)).map((v: string[]) => ({
        name: `${v[0]} ${v[1]}`,
        piped: `https://${v[2]}.${v[0]}`,
        invidious: `https://${v[3]}.${v[0]}`
      }));


    // add to DOM
    for (const api of json) {
      instanceSelector.add(new Option(api.name));
      store.api.push(api);
    }

    const savedApi = getSaved('apiList_4');

    if (!savedApi) {
      instanceSelector.selectedIndex = 1;
      return;
    }

    const apilist = JSON.parse(savedApi);
    store.imageProxy = apilist.imageProxy;
    const api = apilist.api;
    const names = json.map((v: { name: string }) => v.name);
    const index = names.findIndex((v: { name: string }) => v === api.name);

    if (index >= 0)
      instanceSelector.selectedIndex = index + 1;
    else {
      instanceSelector.options[0].textContent = api.name;
      store.api[0] = apilist.api;
    }
  });

instanceSelector.addEventListener('change', async () => {
  const index = instanceSelector.selectedIndex;
  const current = store.api[index];

  if (index === 0) {

    const n = prompt('Enter Name of your instance :');
    const p = prompt('Enter Piped API URL (OPTIONAL) :', current.piped)
    const i = prompt('Enter Invidious API URL (OPTIONAL) :', current.invidious);
    const x = prompt('Enter Image Proxy URL (OPTIONAL) :', store.imageProxy);

    if (n)
      current.name = instanceSelector.options[0].textContent = n;
    if (p)
      current.piped = p;
    if (i)
      current.invidious = i;
    if (x)
      store.imageProxy = x;

    save('apiList_4',
      JSON.stringify(
        { api: current, imageProxy: store.imageProxy }
      )
    );
    return;
  }

  index === 1 ?
    removeSaved('apiList_4') :
    save('apiList_4',
      JSON.stringify(
        { api: current, imageProxy: store.imageProxy }
      )
    );

  if (audio.dataset.playbackState === 'playing')
    audio.pause();
  const timeOfSwitch = audio.currentTime;
  await player(audio.dataset.id);
  audio.currentTime = timeOfSwitch;

});
