import { convertSStoHHMMSS } from "./helpers";
import { playerStore, setNavStore, setPlayerStore, setStore, store, updateParam } from "../stores";
import { config } from "./config";

export async function player(id: string | null = '') {

  if (!id) return;

  if (config.watchMode) {
    setNavStore('video', 'state', true);
    return;
  }

  setPlayerStore({
    playbackState: 'loading',
    status: 'Fetching Data...'
  });


  if (config.jiosaavn) {
    if (!store.useSaavn)
      setStore('useSaavn', true);
    else if (playerStore.stream.author.endsWith('Topic'))
      return import('../modules/jioSaavn').then(mod => mod.default());
  }


  const data = await import('../modules/getStreamData').then(mod => mod.default(id));

  if (data && 'audioStreams' in data)
    setPlayerStore({
      data: data,
      fullDuration: data.duration
    });
  else {
    setPlayerStore({
      playbackState: 'none',
      status: data.message || data.error || 'Fetching Data Failed'
    });
    return;
  }


  import('../modules/setMetadata')
    .then(mod => mod.default({
      id: id,
      title: data.title,
      author: data.uploader,
      duration: convertSStoHHMMSS(data.duration),
      channelUrl: data.uploaderUrl
    }));

  import('../modules/setAudioStreams')
    .then(mod => mod.default(
      data.audioStreams
        .sort((a: { bitrate: string }, b: { bitrate: string }) => (parseInt(a.bitrate) - parseInt(b.bitrate))
        ),
      data.livestream
    ));


  updateParam('s', id);

  if (config.enqueueRelatedStreams)
    import('../modules/enqueueRelatedStreams')
      .then(mod => mod.default(data.relatedStreams as StreamItem[]));



  // related streams imported into discovery after 1min 40seconds, short streams are naturally filtered out

  if (config.discover)
    import('../modules/setDiscoveries')
      .then(mod => {
        setTimeout(() => {
          mod.default(id, data.relatedStreams as StreamItem[]);
        }, 1e5);
      });

}


