import { pipedInstances } from "./dom";
import { getSaved, save } from "./utils";

export default async function api(init: () => void) {

  const [initial_name, initial_url] = (getSaved('pipedInstance') || 'kavin.rocks (Official) 🌐|https://pipedapi.kavin.rocks').split('|');

  pipedInstances.add(new Option(initial_name, initial_url, undefined, true));
  init();

  await fetch('https://piped-instances.kavin.rocks')
    .then(res => res.json())
    .then(data => {
      for (const instance of data) {
        if (initial_url !== instance.api_url)
          pipedInstances.add(new Option(instance.name + ' ' + instance.locations, instance.api_url));
      }
    })
    .catch(err => {
      if (err.message !== 'Failed to fetch') {
        if (confirm(`Unknown Error Detected \n${err}\n send data to developer ?`)) {
          (<HTMLInputElement>document.getElementById('netlifyForm')).value = err;
          document.forms[0].submit();
        }
      }
    })

  // Instance Selector change event

  pipedInstances.addEventListener('change', () => {
    const instance = pipedInstances.options[pipedInstances.selectedIndex];
    const name = instance.textContent;
    const url = instance.value;
    if (name && url)
      save('pipedInstance', name + '|' + url);
  });
}
