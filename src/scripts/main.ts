import '../stylesheets/style.css';
import nav from './nav';
import search from './search';
import listItem from '../components/listItem';
import toggleSwitch from '../components/toggleSwitch';

nav(); // should run before anything else

const pipedInstances = <HTMLSelectElement>document.getElementById('pipedInstances');
const save = localStorage.setItem.bind(localStorage);

const getSaved = localStorage.getItem.bind(localStorage);

// temp disabled 
/* await */fetch('https://piped-instances.kavin.rocks')
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
  .catch(err => {
    if (confirm('Reload app because fetching piped instances failed with error: ' + err))
      location.reload();
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


search(pipedInstances, streamsLoader, getSaved);
listItem();
toggleSwitch();