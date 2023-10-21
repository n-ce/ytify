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
import { img, listItemsContainer } from '../lib/dom';
import { appendToQueuelist, clearQ, firstItemInQueue } from './queue';
import { addToCollection, createPlaylist } from './library';


const streamQuery = params.get('s') || idFromURL(params.get('url')) || idFromURL(params.get('text'));


streamQuery ? player(streamQuery) : img.src = getSaved('img') ? blankImage : '/ytify_thumbnail_min.webp';



// temporary location for these functions below because i couldnt decide where to put them

const playlistContainer = <HTMLDivElement>document.getElementById('playlist');

function listToQ() {

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
  const listTitle = <string>listItemsContainer.dataset.name
  createPlaylist(listTitle);

  playlistContainer.childNodes.forEach(item => addToCollection(listTitle, (<HTMLElement>item).dataset));

});
