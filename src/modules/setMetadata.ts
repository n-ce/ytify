import { actionsMenu, author, img, title } from "../lib/dom";
import { generateImageUrl } from "../lib/imageUtils";
import { store } from "../lib/store";
import { hostResolver } from "../lib/utils";

let more = () => undefined;

document.getElementById('moreBtn')!.addEventListener('click', () => more());


export async function setMetaData(
  stream: CollectionItem
) {

  // remove ' - Topic' from author name if it exists

  let music = '';
  let authorText = stream.author;
  if (stream.author.endsWith(' - Topic')) {
    music = '&w=720&h=720&fit=cover';
    authorText = stream.author.slice(0, -8);
  }

  const metadataObj: MediaMetadataInit = {
    title: stream.title,
    artist: authorText,
  };

  const imgX = generateImageUrl(stream.id, 'maxres', music);
  if (store.loadImage !== 'off') {
    img.src = imgX
    metadataObj.artwork = [
      { src: img.src, sizes: '96x96' },
      { src: img.src, sizes: '128x128' },
      { src: img.src, sizes: '192x192' },
      { src: img.src, sizes: '256x256' },
      { src: img.src, sizes: '384x384' },
      { src: img.src, sizes: '512x512' },
    ]
    img.alt = stream.title;
  }


  title.href = hostResolver(`/watch?v=${stream.id}`);
  title.textContent = stream.title;

  author.textContent = authorText;

  more = function() {
    store.actionsMenu = stream;
    actionsMenu.showModal();
    history.pushState({}, '', '#');
  }


  if (location.pathname === '/')
    document.title = stream.title + ' - ytify';


  if ('mediaSession' in navigator) {
    navigator.mediaSession.setPositionState();
    navigator.mediaSession.metadata = new MediaMetadata(metadataObj);
  }

}
