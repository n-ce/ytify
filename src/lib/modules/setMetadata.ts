import { playerStore, setPlayerStore } from "@lib/stores";
import { config, generateImageUrl } from "@lib/utils";


export default async function(data: CollectionItem) {

  setPlayerStore('stream', data);

  // remove ' - Topic' from author name if it exists

  let music = '';
  let authorText = playerStore.stream.author;
  if (data.author.endsWith(' - Topic')) {
    music = '&w=720&h=720&fit=cover';
    authorText = data.author.slice(0, -8);
  }

  setPlayerStore('isMusic', Boolean(music));

  const metadataObj: MediaMetadataInit = {
    title: data.title,
    artist: authorText,
  };

  const img = generateImageUrl(data.id, 'maxres', music);
  if (config.loadImage) {

    setPlayerStore('mediaArtwork', img);

    metadataObj.artwork = [
      { src: img, sizes: '96x96' },
      { src: img, sizes: '128x128' },
      { src: img, sizes: '192x192' },
      { src: img, sizes: '256x256' },
      { src: img, sizes: '384x384' },
      { src: img, sizes: '512x512' },
    ]
  }

  document.title = data.title + ' - ytify';


  if ('mediaSession' in navigator) {
    navigator.mediaSession.setPositionState();
    navigator.mediaSession.metadata = new MediaMetadata(metadataObj);
  }

}
