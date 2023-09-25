import { pipedInstances } from "../lib/dom";
import { getSaved, save } from "../lib/utils";


const defURL = 'https://pipedapi.kavin.rocks';
const [initial_name, initial_url] = (getSaved('pipedInstance')?.split('|') || ['kavin.rocks (Official) 🌐', defURL]);

pipedInstances.add(new Option(initial_name, initial_url, undefined, true));


fetch('https://piped-instances.kavin.rocks')
  .then(res => res.json())
  .then(data => {
    for (const instance of data)
      if (initial_url !== instance.api_url)
        pipedInstances.add(new Option(instance.name + ' ' + instance.locations, instance.api_url));
  })
  .catch(err => {
    if (err.message === 'Failed to fetch')
      return console.log('fetching instances list failed');
    else if (err.message === 'NetworkError when attempting to fetch resource.')
      return alert('Your network might be blocking our api access although you can continue to use ytify it might be more error prone.');

    if (confirm(`Unknown Error Detected \n${err.message}\n(might be solved if you reload or clear data in settings)\nReport it ? `)) {
      (<HTMLInputElement>document.getElementById('netlifyForm')).value = err + ' in ' + location.href;
      document.forms[0].submit();
    }
  })

// Instance Selector change event

pipedInstances.addEventListener('change', () => {
  const instance = pipedInstances.options[pipedInstances.selectedIndex];
  const name = instance.textContent;
  const url = instance.value;
  if (name && url)
    save('pipedInstance', name + '|' + url);
  if (url === defURL)
    localStorage.removeItem('pipedInstance');
});
