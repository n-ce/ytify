import { instanceSelector } from "../lib/dom";
import { quickSwitch, removeSaved, save } from "../lib/utils";
import { store, getSaved } from "../store";


const hlsOn = store.player.HLS;

const instanceAPIurl = hlsOn ? 'https://piped-instances.kavin.rocks' : 'https://raw.githubusercontent.com/n-ce/Uma/main/unified_instances.txt';

fetch(instanceAPIurl)
  .then(res => hlsOn ? res.json() : res.text())
  .then(text => {

    const json = hlsOn ?
      text.map((v: Record<'name' | 'locations' | 'api_url' | 'image_proxy_url', string>) => ({
        name: `${v.name} ${v.locations}`,
        piped: v.api_url,
        invidious: 'https://invidious.fdn.fr'
      })) :
      text.split('\n\n').map((v: string) => {
        const [name, flag, pi, iv] = v.split(', ');
        return {
          name: `${name} ${flag}`,
          piped: `https://${pi}.${name}`,
          invidious: `https://${iv}.${name}`
        }
      });


    // add to DOM
    for (const api of json) {
      instanceSelector.add(new Option(api.name));
      store.api.push(api);
    }

    const savedApi = getSaved('apiList_5');

    if (!savedApi) {
      instanceSelector.selectedIndex = 1;
      return;
    }

    const api = JSON.parse(savedApi);
    const names = json.map((v: { name: string }) => v.name);
    const index = names.findIndex((v: { name: string }) => v === api.name);

    if (index >= 0)
      instanceSelector.selectedIndex = index + 1;
    else {
      instanceSelector.options[0].textContent = api.name;
      store.api[0] = api;

    }
  });

instanceSelector.addEventListener('change', async () => {
  const index = instanceSelector.selectedIndex;
  const current = store.api[index];

  if (index === 0) {

    const n = prompt('Enter Name of your instance :');
    const p = prompt('Enter Piped API URL :', current.piped)

    if (n)
      current.name = instanceSelector.options[0].textContent = n;
    if (p)
      current.piped = p;

    save('apiList_5', JSON.stringify(current));

  }
  else index === 1 ?
    removeSaved('apiList_5') :
    save('apiList_5', JSON.stringify(current));

  quickSwitch();
});
