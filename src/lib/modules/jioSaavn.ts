import { playerStore, setPlayerStore, setStore, updateParam } from "@lib/stores";
import { config, player } from "@lib/utils";

export default function() {
  setPlayerStore('status', 'Fetching Data via JioSaavn...');
  const { stream, audio } = playerStore;
  const { author, id, title } = stream;

  fetch(`https://fast-saavn.vercel.app/api/saavn?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(author)}`)
    .then(res => {
      if (!res.ok) {
        return res.text().then(text => { throw new Error(text); });
      }
      return res.json();
    })
    .then(matchingTrack => {
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
