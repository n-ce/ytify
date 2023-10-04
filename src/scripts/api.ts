import { audio, pipedInstances } from "../lib/dom";
import player from "../lib/player";
import { getSaved, save } from "../lib/utils";


const defURL = 'https://pipedapi.kavin.rocks';
const [initial_name, initial_url] = (getSaved('pipedInstance')?.split('|') || ['kavin.rocks (Official) 🌐', defURL]);

pipedInstances.add(new Option(initial_name, initial_url, undefined, true));

const apiList = 'https://piped-instances.kavin.rocks';

fetch(apiList)
  .then(res => res.json())
  .then(data => {
    for (const instance of data)
      if (initial_url !== instance.api_url)
        pipedInstances.add(new Option(instance.name + ' ' + instance.locations, instance.api_url));
  })
  .catch(err => {
    if (err.message === 'Failed to fetch')
      return console.log('fetching instances list failed');

    if (confirm('API blockage detected, more likely an error on your side, you can continue to use services but they may not work optimally. Investigate issue ?')) {
      const text = prompt('Visit ' + apiList + ' in another tab, you can write what you see here, clicking on ok will report it. Alternatively if you have github submit an issue at https://github.com/n-ce/ytify/issues');
      if (!text) return;
      (<HTMLInputElement>document.getElementById('netlifyForm')).value = text + ' ' + err;
      document.forms[0].submit();
    }
  })

// Instance Selector change event

pipedInstances.addEventListener('change', async () => {
  const instance = pipedInstances.options[pipedInstances.selectedIndex];
  const name = instance.textContent;
  const url = instance.value;
  if (name && url)
    save('pipedInstance', name + '|' + url);
  if (url === defURL)
    localStorage.removeItem('pipedInstance');
  const timeOfSwitch = audio.currentTime;
  await player(audio.dataset.id);
  audio.currentTime = timeOfSwitch;
});