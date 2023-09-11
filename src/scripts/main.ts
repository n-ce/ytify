import '../stylesheets/style.css';
import { convertSStoHHMMSS, getSaved, params, save, unixTsFMT, viewsFormatter } from './utils';
import api from './api';
import nav from './nav';
import theme from './theme';
import search from './search';
import listItem from '../components/listItem';
import listItemCSS from '../components/listItem.css?inline';
import toggleSwitch from '../components/toggleSwitch';
import toggleSwitchCSS from '../components/toggleSwitch.css?inline';


const pipedInstances = <HTMLSelectElement>document.getElementById('pipedInstances');
const img = document.querySelector('img');

function init() {
  if (params.has('e')) {
    location.replace(params.get('e') || '/');
    return;
  }
  nav(params);
  if (img)
    theme(img, getSaved, save);
  search(pipedInstances, streamsLoader, getSaved, save, params);
  listItem(convertSStoHHMMSS, viewsFormatter, unixTsFMT, listItemCSS);
  toggleSwitch(toggleSwitchCSS);
}

api(pipedInstances, init, save, getSaved);





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
      if (img)
        img.src = stream.thumbnail;
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


