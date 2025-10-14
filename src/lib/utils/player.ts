import { convertSStoHHMMSS } from "./helpers";
import { playerStore, setNavStore, setPlayerStore, setStore, store, updateParam } from "@lib/stores";
import { config } from "./config";

let playerAbortController: AbortController;
export async function player(id?: string) {

  if (playerAbortController)
    playerAbortController.abort();

  playerAbortController = new AbortController();

  if (!id) return;

  if (config.watchMode) {
    setNavStore('video', 'state', true);
    return;
  }

  setPlayerStore({
    playbackState: 'loading',
    status: 'Fetching Data...'
  });


  if (!store.useSaavn)
    setStore('useSaavn', true);
  else if (playerStore.stream.author.endsWith('Topic'))
    return import('../modules/jioSaavn').then(mod => mod.default());

  if (!store.invidious.length)
    setStore('snackbar', 'No Instances are Available');

  const data = await import('../modules/getStreamData').then(mod => mod.default(id, false, playerAbortController.signal));

  if (data && 'audioStreams' in data)
    setPlayerStore({
      data,
      fullDuration: data.duration
    });
  else {
    setPlayerStore({
      playbackState: 'none',
      status: data.message || data.error || 'Fetching Data Failed'
    });
    setStore('snackbar', playerStore.status);
    return;
  }


  await import('../modules/setMetadata')
    .then(mod => mod.default({
      id,
      title: data.title,
      author: data.uploader,
      duration: convertSStoHHMMSS(data.duration),
      authorId: data.uploaderUrl.slice(9)
    }));

  import('../modules/setAudioStreams')
    .then(mod => mod.default(
      data.audioStreams
        .sort((a: { bitrate: string }, b: { bitrate: string }) => (parseInt(a.bitrate) - parseInt(b.bitrate))
        )
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


