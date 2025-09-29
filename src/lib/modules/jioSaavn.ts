import { playerStore, setPlayerStore, setStore, store, updateParam } from "@lib/stores";
import { config, player } from "@lib/utils";

export default function() {
  setPlayerStore('status', 'Fetching Data via JioSaavn...');
  const { stream, audio } = playerStore;
  const { author, id, title } = stream;
  const query = encodeURIComponent(`${title.replace(/\(.*?\)/g, '')} ${author.replace(' - Topic', '')}`);
  const normalizeString = (str: string) => str.normalize("NFD").replace(/[̀-ͯ]/g, "");

  fetch(`${store.api.jiosaavn}/api/search/songs?query=${query}`)
    .then(res => res.json())
    .then(res => {

      const matchingTrack = res.data.results.find((track: {
        name: string,
        artists: { primary: { name: string }[] }
      }) =>

        normalizeString(title).toLowerCase().startsWith(normalizeString(track.name).toLowerCase()) &&
        track.artists.primary.some(artist => normalizeString(author).toLowerCase().startsWith(normalizeString(artist.name).toLowerCase()))
      );
      if (!matchingTrack) throw new Error('Music stream not found in JioSaavn results');

      setPlayerStore('data', matchingTrack);

      return matchingTrack.downloadUrl;
    })
    .then(downloadUrl => {

      import('../modules/setMetadata')
        .then(mod => mod.default(stream));

      const { url } = downloadUrl[{
        low: 1,
        medium: downloadUrl.length - 2,
        high: downloadUrl.length - 1
      }[config.quality]];

      audio.src = url.replace('http:', 'https:');

      updateParam('s', id);

    })
    .catch(e => {
      setPlayerStore('status', e.message || e.error || 'JioSaavn Playback Failure');
      setStore('useSaavn', false);
      player(id);
    });
}
