import { store } from "../lib/store";

export async function getData(id: string) {
  /*
  If HLS
  use full instance list
  else 
  use unified instance list
  > Get HLS/AudioStreams from Piped
  if not available
  > Get AudioStreams from Invidious
  */

  async function fetchDataFromPiped(
    api: string,
    index: number
  ) {
    if (index < noOfUnifiedInstances)
      return fetch(`${api}/streams/${id}`)
        .then(res => res.json())
        .then(data => {
          if ('audioStreams' in data) {
            store.api.index = index;
            return data;
          }
          else throw new Error(data.message);
        });
    else throw new Error();
  }

  async function fetchDataFromInvidious(
    api: string
  ) {
    return fetch(`${api}/api/v1/videos/${id}`)
      .then(res => res.json())
      .then(data => {
        if ('adaptiveFormats' in data)
          return data;
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
      }))
  }



  const h = store.player.HLS;
  const noOfUnifiedInstances = store.api[h ? 'piped' : 'invidious'].length;
  const piped = store.api.piped.map(fetchDataFromPiped);
  const invidious = store.api.invidious.map(fetchDataFromInvidious);
  const res = await Promise.any(piped);

  return h ? res : (res ? res : invidious);

}

