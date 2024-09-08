import { store } from "../lib/store";
import { notify } from "../lib/utils";


export function getData(id: string) {

  const controller = store.api.list.length > 2 ? new AbortController() : undefined;
  const type = store.api.type;
  const list = store.api.list;

  return !controller ?
    fetchVia[type](id, list[0][type]) :
    Promise.any(
      store.api.list.map(v =>
        fetchVia[type](id, v[type], controller.signal)
          .then((_: {
            audioStreams: {
              bitrate: number,
              encoding: string,
              url: string
            }[]
          }) => new Promise(res => {

            const audio = new Audio();
            audio.onloadedmetadata = function() {
              audio.remove();
              controller.abort('Resolved');
              res(_);
            }
            audio.src = _.audioStreams
              .filter(s => s.encoding === 'aac')
              .sort((a, b) => a.bitrate - b.bitrate)
            [0].url;

          }))
          .catch(() => notify('All Public Instances Failed.'))
      ));

}



const fetchVia = {
  'piped': (
    id: string,
    apiUrl: string,
    signal: AbortSignal | undefined = undefined
  ) =>
    fetch(apiUrl + '/streams/' + id, { signal })
      .then(res => res.json())
      .then(data => {
        if ('audioStreams' in data)
          return data;
        else throw new Error(data.message);
      }),

  'invidious': (
    id: string,
    apiUrl: string,
    signal: AbortSignal | undefined = undefined
  ) =>
    fetch(`${apiUrl}/api/v1/videos/${id}`, { signal })
      .then(res => res.json())
      .then(data => {
        if ('adaptiveFormats' in data)
          return data;
        else throw new Error(data.error);
      })
      .then((data: {
        adaptiveFormats: {
          type: string,
          bitrate: number,
          encoding: string,
          clen: string,
          url: string
        }[],
        recommendedVideos: {
          title: string,
          author: string,
          lengthSeconds: number,
          authorUrl: string,
          videoId: string
        }[],
        title: string,
        author: string,
        lengthSeconds: number,
        authorUrl: string,
        genre: string,
        liveNow: boolean
      }) => ({
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
          bitrate: v.bitrate,
          codec: v.encoding,
          contentLength: v.clen,
          quality: Math.floor(v.bitrate / 1024) + ' kbps',
          mimeType: v.type,
          url: v.url.replace(new URL(v.url).origin, apiUrl)
        }))
      }))
}


