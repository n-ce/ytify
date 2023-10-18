import '../stylesheets/style.css';
import './api';
import './router';
import './theme';
import './search';
import './library';
import './miscEvents';
import './audioEvents';
import './queue';
import './superModal';
import '../components/streamItem';
import '../components/listItem';
import '../components/toggleSwitch';
import { blankImage, getSaved, idFromURL, params } from '../lib/utils';
import player from '../lib/player';
import { audio, img } from '../lib/dom';
import { appendToQueuelist, clearQ, firstItemInQueue } from './queue';
import { addToCollection, removeFromCollection } from './library';


const streamQuery = params.get('s') || idFromURL(params.get('url')) || idFromURL(params.get('text'));


streamQuery ? player(streamQuery) : img.src = getSaved('img') ? blankImage : '/ytify_thumbnail_min.webp';


const favButton = <HTMLInputElement>document.getElementById('favButton');

const icons = ['ri-heart-line', 'ri-heart-fill'];
favButton.addEventListener('click', () => {
  if (!audio.dataset.id) return;
  favButton.checked ?
    addToCollection('favorites', audio.dataset) :
    removeFromCollection('favorites', <string>audio.dataset.id);

  favButton.nextElementSibling?.classList.replace(icons[0], icons[1]);
  icons.reverse();
})




function listToQ() {
  const playlistContainer = <HTMLDivElement>document.getElementById('playlist');

  const children = <HTMLCollectionOf<HTMLElement>>playlistContainer.children;

  for (const child of children)
    appendToQueuelist(child.dataset)
}


(<HTMLButtonElement>document.getElementById('playAllBtn')).addEventListener('click', () => {
  clearQ();
  listToQ();
  firstItemInQueue().click();
});

(<HTMLButtonElement>document.getElementById('enqueueAllBtn')).addEventListener('click', () => {
  if (firstItemInQueue().matches('h1')) firstItemInQueue().remove();
  listToQ();
});

(<HTMLButtonElement>document.getElementById('saveListBtn')).addEventListener('click', () => {
  alert('this feature has not been implemented yet');
});
