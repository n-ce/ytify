import { playButton } from "../lib/dom";
import { store } from "../lib/store";
import { notify } from "../lib/utils";

export async function getData(
  id: string
): Promise<Piped> {
  /*
  If HLS
  use full instance list
  else 
  use unified instance list
  > Get HLS/AudioStreams from Piped
  if not available
  > Get AudioStreams from Invidious
  */

  const fetchDataFromPiped = (
    api: string
  ) => fetch(`${api}/streams/${id}`)
    .then(res => res.json())
    .then(data => {
      if (data && 'audioStreams' in data) {
        store.api.index = store.api.piped.indexOf(api);
        return data;
      }
      else throw new Error(data.message);
    });


  const fetchDataFromInvidious = (
    api: string
  ) => fetch(`${api}/api/v1/videos/${id}`)
    .then(res => res.json())
    .then(data => {
      if (data && 'adaptiveFormats' in data) {
        store.api.index = store.api.invidious.indexOf(api);
        return data;
      }
      else throw new Error(data.error);
    })
    .then((data: Invidious) => ({
      title: data.title,
      uploader: data.author,
      duration: data.lengthSeconds,
      uploaderUrl: data.authorUrl,
      category: data.genre,
      liveStream: data.liveNow,
      subtitles: [],
      relatedStreams: data.recommendedVideos.map(v => ({
        url: '/watch?v=' + v.videoId,
        title: v.title,
        uploaderName: v.author,
        duration: v.lengthSeconds,
        uploaderUrl: v.authorUrl,
        type: 'stream'
      })),
      audioStreams: data.adaptiveFormats.filter((f) => f.type.startsWith('audio')).map((v) => ({
        bitrate: parseInt(v.bitrate),
        codec: v.encoding,
        contentLength: v.clen,
        quality: Math.floor(parseInt(v.bitrate) / 1024) + ' kbps',
        mimeType: v.type,
        url: v.url.replace(new URL(v.url).origin, api)
      }))
    }));


  const h = store.player.HLS;
  const iv = store.api.invidious;
  const pi = store.api.piped;

  const res = await Promise.any(
    pi
      .filter((_, i) => i < (h ? pi : iv).length)
      .map(fetchDataFromPiped)
  )
    .catch(() => h ? {} : Promise.any(
      iv.map(fetchDataFromInvidious)
    ).catch(() => {
      // do not update ui for queue prefetch items
      if (store.stream.id === id) {
        playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
        notify('Could not retrieve stream data in any ways.. Trying again..');
      }
    }));


  return res ? res : getData(id);
}

