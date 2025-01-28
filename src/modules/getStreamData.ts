import { store } from "../lib/store";

export async function getData(
  id: string,
  prefetch: boolean = false
): Promise<Piped | Record<'error' | 'message', string>> {

  const inv = store.api.invidious;
  const pip = store.api.piped;
  const hls = store.player.hls;

  const fetchDataFromPiped = (
    api: string
  ) => fetch(`${api}/streams/${id}`)
    .then(res => res.json())
    .then(data => {
      if (hls.on ? data.hls : data.audioStreams.length) {
        return data;
      }
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
      videoStreams: data.adaptiveFormats.filter((f) => f.type.startsWith('video')),
      audioStreams: data.adaptiveFormats.filter((f) => f.type.startsWith('audio')).map((v) => ({
        bitrate: parseInt(v.bitrate),
        codec: v.encoding,
        contentLength: parseInt(v.clen),
        quality: Math.floor(parseInt(v.bitrate) / 1024) + ' kbps',
        mimeType: v.type,
        url: v.url
      }))
    }));

  const emergency = (e: AggregateError) =>
    (!prefetch && store.player.fallback) ?
      fetchDataFromPiped(store.player.fallback)
        .catch(() => e.errors[0]) :
      e.errors[0];

  const useInvidious = (e: AggregateError, index = 0): Piped => hls.on ?
    e.errors[0] :
    fetchDataFromInvidious(inv[index])
      .catch(() => {
        if (index + 1 === inv.length)
          return emergency(e);
        else return useInvidious(e, index + 1);
      })

  const usePiped = hls.on ?
    Promise
      .allSettled(hls.api.map(fetchDataFromPiped))
      .then(res => {
        const ff = res.filter(r => r.status === 'fulfilled');
        hls.manifests.length = 0;

        ff.forEach(r => {
          if (r.value.hls) {
            hls.manifests.push(r.value.hls);
          }
        });

        return ff[0].value || { message: 'No HLS sources are available.' };
      }) :
    fetchDataFromPiped(pip[0]);

  return usePiped.catch(useInvidious);
}

