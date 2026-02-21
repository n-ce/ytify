import { playerStore, setPlayerStore, setStore, updateParam } from "@stores";
import { config, player } from "@utils";

export default function() {
  setPlayerStore('status', 'Loading music information...');

  const { stream, audio } = playerStore;
  const { author, id, title } = stream;

  fetch(`https://fast-saavn.vercel.app/api?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(author?.replace(' - Topic', '') ?? '')}&duration=${encodeURIComponent(stream.duration)}`)
    .then(async res => {
      if (!res.ok) {
        return res.text().then(text => { throw new Error(text); });
      }
      return res.text();
    })
    .then(trimmedDownloadUrl => {
      if (!trimmedDownloadUrl) throw new Error('Music stream not found in JioSaavn results');

      const baseUrl = 'https://aac.saavncdn.com/';
      const desiredBitrateSuffix = ({
        worst: '12',
        low: '48',
        medium: '160',
        high: '320'
      })[config.quality] || '320';
      const fullDownloadUrl = `${baseUrl}${trimmedDownloadUrl}_${desiredBitrateSuffix || '96'}.mp4`;

      setPlayerStore('data', { ...stream, downloadUrl: fullDownloadUrl });

      import('../modules/setMetadata')
        .then(mod => mod.default(stream));


      delete audio.dataset.retried;
      audio.src = fullDownloadUrl;
      updateParam('s', id);

    })
    .catch(e => {
      setPlayerStore('status', e.message || e.error || 'JioSaavn Playback Failure');
      setStore('useSaavn', false);
      player(id);
    });
}