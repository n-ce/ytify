export default async function api(
  pipedInstances: HTMLSelectElement,
  init: () => void,
  save: (key: string, value: string) => void,
  getSaved: (key: string) => string | null
) {

  await fetch('https://piped-instances.kavin.rocks')
    .then(res => res.json())
    .then(data => {
      for (const instance of data) {
        const name = instance.name + ' ' + instance.locations;
        pipedInstances.add(new Option(
          name, instance.api_url, undefined,
          getSaved('pipedInstance')?.split('|')[0] === name
        ));
      }
    })
    .then(() => init())
    .catch(err => {
      let instance, instanceName, instanceUrl;

      if (err.message === 'Failed to fetch') {
        instance = getSaved('pipedInstance');

        instance ?
          [instanceName, instanceUrl] = instance.split('|') :
          instanceName = instanceUrl = prompt('Fetching Piped Instances failed.\n A simple reload might fix this otherwise you have to enter your own instance or enter one from', 'https://github.com/TeamPiped/Piped/wiki/Instances');

        if (instanceName && instanceUrl) {
          pipedInstances.add(new Option(instanceName, instanceUrl, undefined, true));
          init();
        }
      }
      else {
        if (confirm(`Unknown Error Detected \n${err}\n send data to developer ?`)) {
          (<HTMLInputElement>document.getElementById('netlifyForm')).value = err;
          document.forms[0].submit();
        }
      }
    });

  // Instance Selector change event

  pipedInstances.addEventListener('change', () => {
    const instance = pipedInstances.options[pipedInstances.selectedIndex];
    const name = instance.textContent;
    const url = instance.value;
    if (name && url)
      save('pipedInstance', name + '|' + url);
  });
}
