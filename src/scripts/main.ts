import '../stylesheets/style.css';
import nav from './nav';
import search from './search';
import listItem from '../components/listItem';
import toggleSwitch from '../components/toggleSwitch';

const params = (new URL(location.href)).searchParams;


function init() {
  if (params.has('e')) {
    location.replace(params.get('e') || '/');
    return;
  }
  nav(params);
  search(pipedInstances, streamsLoader, getSaved, params);
  listItem();
  toggleSwitch();
}



const pipedInstances = <HTMLSelectElement>document.getElementById('pipedInstances');
const save = localStorage.setItem.bind(localStorage);

const getSaved = localStorage.getItem.bind(localStorage);


await fetch('https://piped-instances.kavin.rocks')
  .then(res => res.json())
  .then(data => {
    for (const instance of data) {
      const name = instance.name + ' ' + instance.locations;
      pipedInstances.add(new Option(
        name, instance.api_url, undefined,
        getSaved('pipedInstance') === name
      ));
    }
  })
  .then(_ => init())
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
      if (confirm('Unknown error detected, send error data to developer ?')) {
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


// Loads streams into related streams / search / upcoming
type stream = 'title' | 'name' | 'uploaderName' | 'description' | 'thumbnail' | 'type' | 'url' | 'views' | 'duration' | 'uploaded' | 'uploaderAvatar';

function streamsLoader(streamsArray: Record<stream, string>[]): DocumentFragment {

  const fragment = document.createDocumentFragment();

  for (const stream of streamsArray) {
    const listItem = document.createElement('list-item');
    listItem.textContent = stream.title || stream.name;
    listItem.dataset.author = stream.uploaderName || stream.description;
    listItem.dataset.thumbnail = stream.thumbnail;
    listItem.dataset.views = stream.views;
    listItem.dataset.duration = stream.duration;
    listItem.dataset.uploaded = stream.uploaded;
    listItem.dataset.avatar = stream.uploaderAvatar;
    listItem.addEventListener('click', () => {
      /*
      switch (stream.type) {
        case 'stream':
          validator(null, null, stream.url.slice(9));
          break;
        case 'playlist':
          validator(null, stream.url.slice(15), null);
          break;
        case 'channel':
          open('https://youtube.com' + stream.url);
          //		fetch(api[0] + stream.url).then(res => res.json()).then(channel => streamsLoader(channel.relatedStreams));
          break;
      }*/

    });
    fragment.appendChild(listItem);
  }
  return fragment;
}


