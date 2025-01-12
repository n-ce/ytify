import { store } from "../lib/store";

export async function getData(
  id: string,
  prefetch: boolean = false
): Promise<Piped | Error & { error: string }> {

  const hls = store.player.HLS;
  const inv = store.api.invidious.slice(1);
  const pip = store.api.piped;

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

  const emergency = (e: AggregateError) =>
    (!prefetch && store.player.fallback) ?
      fetchDataFromPiped(store.player.fallback)
        .catch(() => e.errors[0]) :
      e.errors[0];

  const useInvidious = (e: AggregateError) => hls ?
    e.errors[0] :
    Promise.any(inv.map(fetchDataFromInvidious))
      .catch(emergency);

  const usePiped = hls ?
    Promise
      .allSettled(pip.map(fetchDataFromPiped))
      .then(res => {
        const ff = res.filter(r => r.status === 'fulfilled');
        store.player.hlsCache.length = 0;

        ff.forEach(r => {
          if (r.value.hls) {
            store.player.hlsCache.push(r.value.hls);
          }
        });

        return ff[0].value || { message: 'No HLS sources are available.' };
      }) :
    fetchDataFromPiped(pip[0]);

  return usePiped.catch(useInvidious);
}

