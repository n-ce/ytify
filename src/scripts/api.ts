import { audio, instanceSelector } from "../lib/dom";
import player from "../lib/player";
import { getSaved, removeSaved, save } from "../lib/utils";

fetch('https://piped-instances.kavin.rocks')
  .then(res => res.json())
  .then((data: Record<'name' | 'api_url', string>[]) => {
    // add to DOM
    for (const api of data)
      instanceSelector.add(new Option(api.name, api.api_url))

    const savedApi = getSaved('apiList_3L');

    if (!savedApi) {
      instanceSelector.selectedIndex = 1;
      return;
    }

    const [savedName, savedValue] = savedApi.split(',');
    const names = data.map(v => v.name);
    const index = names.findIndex(v => v === savedName);

    if (index >= 0)
      instanceSelector.selectedIndex = index + 1;
    else {
      const custom = instanceSelector.options[0];
      custom.textContent = savedName;
      custom.value = savedValue;
    }

  });

instanceSelector.addEventListener('change', async () => {
  const index = instanceSelector.selectedIndex;
  let [currentName, currentValue] = [instanceSelector.options[index].textContent, instanceSelector.value];

  if (index === 0) {
    const n = prompt('Enter Name of your instance :');
    const v = prompt('Enter Piped API URL :')
    if (n)
      currentName = n;
    if (v)
      currentValue = v;
    save('apiList_3L',
      [currentName, currentValue].join(','));
    return;
  }

  index === 1 ?
    removeSaved('apiList_3L') :
    save('apiList_3L', [currentName, currentValue].join(','));

  if (audio.dataset.playbackState !== 'playing') return;

  audio.pause();
  const timeOfSwitch = audio.currentTime;
  await player(audio.dataset.id);
  audio.currentTime = timeOfSwitch;
});


