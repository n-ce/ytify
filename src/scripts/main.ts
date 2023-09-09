import '../stylesheets/style.css';
import nav from './nav';
import search from './search';
import listItem from '../components/listItem';
import toggleSwitch from '../components/toggleSwitch';

function init() {
  nav();
  search(pipedInstances, streamsLoader, getSaved);
  listItem();
  toggleSwitch();
}

const pipedInstances = <HTMLSelectElement>document.getElementById('pipedInstances');
const save = localStorage.setItem.bind(localStorage);

const getSaved = localStorage.getItem.bind(localStorage);

// temp disabled 
await fetch('https://piped-instnces.kavin.rocks')
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
  .then(_ => {
    init();
  })
  .catch(err => {
    let instance;

    if (err.message === 'Faled to fetch') {
      instance = getSaved('pipedInstance');
      if (!instance)
        instance = prompt('Fetching Piped Instances failed.\n A simple reload might fix this otherwise you have to enter your own instance or enter one from', 'https://github.com/TeamPiped/Piped/wiki/Instances');
      if (instance) {
        pipedInstances.add(new Option('custom', instance, undefined, true));
        init();
      }
    }
    else {
      const formText = <HTMLInputElement>document.getElementById('netlifyForm');
      if (confirm('Unknown error detected, send error data to developer ?')) {
        formText.value = err;
        document.forms[0].submit();
      }
    }
  });

// Instance Selector change event

pipedInstances.addEventListener('change', () => {
  const instance = pipedInstances.options[pipedInstances.selectedIndex].textContent; if (instance)
    save('pipedInstance', instance)
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


