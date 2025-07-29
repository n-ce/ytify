import { store, params, state } from '../lib/store';
import { audio, qualityView, title } from '../lib/dom';
import { setMetaData } from './setMetadata';
import player from '../lib/player';

export default function() {
  title.textContent = 'Fetching Data via JioSaavn...';
  const { author, id } = store.stream;
  const query = encodeURIComponent(`${store.stream.title.replace(/\(.*?\)/g, '')} ${author.replace(' - Topic', '')}`);


  fetch(`${store.api.jiosaavn}/api/search/songs?query=${query}`)
    .then(res => res.json())
    .then(res => {

      const matchingTrack = res.data.results.find((track: {
        name: string,
        artists: { primary: { name: string }[] }
      }) =>

        store.stream.title.startsWith(track.name) &&
        track.artists.primary.some(artist => author.startsWith(artist.name))
      );
      if (!matchingTrack) throw new Error('Music stream not found in JioSaavn results');
      store.player.data = matchingTrack;

      return matchingTrack.downloadUrl;
    })
    .then(downloadUrl => {

      setMetaData(store.stream);

      const { url, quality } = downloadUrl[{
        low: 1,
        medium: downloadUrl.length - 2,
        high: downloadUrl.length - 1
      }[state.quality]];

      audio.src = url.replace('http:', 'https:');
      qualityView.textContent = quality + ' AAC';
      params.set('s', id);

      if (location.pathname === '/')
        history.replaceState({}, '', location.origin + '?s=' + params.get('s'));
    })
    .catch(e => {
      title.textContent = e.message || e.error || 'JioSaavn Playback Failure';
      store.player.useSaavn = false;
      player(store.stream.id);
    });
}
