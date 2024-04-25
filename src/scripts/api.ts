import { audio, instanceSelector } from "../lib/dom";
import player from "../lib/player";
import { getSaved, removeSaved, save } from "../lib/utils";

const unifiedInstancesAPIurl = 'https://raw.githubusercontent.com/wiki/n-ce/ytify/unified_instances.md';

fetch(unifiedInstancesAPIurl)
  .then(res => res.text())
  .then(text => JSON.parse(text.slice(3)))
  .then((json: { [index: string]: string }[]) => {
    // add to DOM
    for (const api of json)
      instanceSelector.add(new Option(api.name, JSON.stringify(api)))

    const savedApi = getSaved('apiList_3');

    if (!savedApi) {
      instanceSelector.selectedIndex = 1;
      return;
    }

    const api = JSON.parse(savedApi);
    const names = json.map(v => v.name);
    const index = names.findIndex(v => v === api.name);

    if (index >= 0)
      instanceSelector.selectedIndex = index + 1;
    else {
      const custom = instanceSelector.options[0];
      custom.textContent = api.name;
      custom.value = savedApi;
    }

  });

instanceSelector.addEventListener('change', async () => {
  const index = instanceSelector.selectedIndex;
  if (index === 0) {
    const n = prompt('Enter Name of your instance :');
    const p = prompt('Enter Piped API URL :')
    const t = prompt('Enter Piped Proxy URL (OPTIONAL) :');
    const i = prompt('Enter Invidious API URL (OPTIONAL) : ')
    const current = JSON.parse(instanceSelector.value);
    if (n)
      current.name = n;
    if (p)
      current.piped = p;
    if (t)
      current.image = t;
    if (i)
      current.invidious = i;
    save('apiList_3', JSON.stringify(current));
    return;
  }

  index === 1 ?
    removeSaved('apiList_3') :
    save('apiList_3', instanceSelector.value);

  if (audio.dataset.playbackState !== 'playing') return;

  audio.pause();
  const timeOfSwitch = audio.currentTime;
  await player(audio.dataset.id);
  audio.currentTime = timeOfSwitch;
});


