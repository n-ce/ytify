// import in order of site usage to minimize loading time
import '../stylesheets/style.css';
import './api';
import './router';
import './theme';
import './search';
import './audioEvents';
import './library';
import './superModal';
import './queue';
import './miscEvents';
import '../components/streamItem';
import '../components/listItem';
import '../components/toggleSwitch';
import { blankImage, getSaved, idFromURL, params } from '../lib/utils';
import player from '../lib/player';
import { img, listContainer } from '../lib/dom';
import { appendToQueuelist, clearQ, firstItemInQueue } from './queue';
import { addToCollection, createPlaylist } from './library';


const streamQuery = params.get('s') || idFromURL(params.get('url')) || idFromURL(params.get('text'));


streamQuery ? player(streamQuery) : img.src = getSaved('img') ? blankImage : '/ytify_thumbnail_min.webp';



// temporary location for these functions below because i couldnt decide where to put them


function listToQ() {
  listContainer.childNodes.forEach(e => appendToQueuelist((<HTMLElement>e).dataset))
}

// list tools functions

const [playAllBtn, enqueueBtn, saveListBtn, openInYtBtn] = (<HTMLSpanElement>document.getElementById('listTools')).children;

playAllBtn.addEventListener('click', () => {
  clearQ();
  listToQ();
  firstItemInQueue().click();
});

enqueueBtn.addEventListener('click', () => {
  if (firstItemInQueue()?.matches('h1')) firstItemInQueue().remove();
  listToQ();
});

saveListBtn.addEventListener('click', () => {
  const listTitle = <string>listContainer.dataset.name;

  createPlaylist(listTitle);

  listContainer.childNodes.forEach(item => addToCollection(listTitle, (<HTMLElement>item).dataset));
});

openInYtBtn.addEventListener('click', () => {
  open('https://youtube.com' + listContainer.dataset.url);
})