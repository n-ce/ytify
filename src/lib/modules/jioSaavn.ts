import { playerStore, setPlayerStore, setStore, updateParam } from "@lib/stores";
import { config, player } from "@lib/utils";

export default function() {
  setPlayerStore('status', 'Loading music information...');

  const { stream, audio } = playerStore;
  const { author, id, title } = stream;

  fetch(`https://fast-saavn.vercel.app/api/find?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(author.replace(' - Topic', ''))}&duration=${encodeURIComponent(stream.duration)}`)
    .then(async res => {
      if (!res.ok) {
        return res.text().then(text => { throw new Error(text); });
      }
      return res.json();
    })
    .then(song => {
      if (!song) throw new Error('Music stream not found in JioSaavn results');

      setPlayerStore('data', song);

      import('../modules/setMetadata')
        .then(mod => mod.default(stream));

      const desiredBitrateSuffix = ({
        low: '_48',
        medium: '_160',
        high: '_320'
      })[config.quality] || '_320';

      audio.src = song.downloadUrl.replace('_96', desiredBitrateSuffix);
      updateParam('s', id);

    })
    .catch(e => {
      setPlayerStore('status', e.message || e.error || 'JioSaavn Playback Failure');
      setStore('useSaavn', false);
      player(id);
    });
}
