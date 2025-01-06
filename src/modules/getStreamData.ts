import { store } from "../lib/store";

export async function getData(
  id: string,
  prefetch: boolean = false
): Promise<Piped | Error & { error: string }> {
  /*
  If HLS try with piped
  else 
   try with piped
    try with invidious
     try with fallback
  */

  const fetchDataFromPiped = (
    api: string
  ) => fetch(`${api}/streams/${id}`)
    .then(res => res.json())
    .then(data => {
      if (data && 'audioStreams' in data && data.audioStreams.length)
        return data;
      else throw new Error(data.message);
    });


  const fetchDataFromInvidious = (
    api: string
  ) => fetch(`${api}/api/v1/videos/${id}`)
    .then(res => res.json())
    .then(data => {
      if (data && 'adaptiveFormats' in data)
        return data;
      else throw new Error(data.error);
    })
    .then((data: Invidious) => ({
      title: data.title,
      uploader: data.author,
      duration: data.lengthSeconds,
      uploaderUrl: data.authorUrl,
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
        contentLength: parseInt(v.clen),
        quality: Math.floor(parseInt(v.bitrate) / 1024) + ' kbps',
        mimeType: v.type,
        url: v.url
      }))
    }));


  const h = store.player.HLS;
  const iv = store.api.invidious;
  const pi = store.api.piped;

  return (h ?
    Promise.any(pi.map(fetchDataFromPiped)) :
    fetchDataFromPiped(pi[0])
  )
    .catch(e => h ?
      e.errors[0] :
      Promise.any(iv.map(fetchDataFromInvidious))
        .catch(e => {
          if (!prefetch && store.player.fallback)
            return fetchDataFromPiped(store.player.fallback)
              .catch(() => e.errors[0])
        })
    );

}

