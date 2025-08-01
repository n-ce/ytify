import { state, store } from "../lib/store";

export default async function(
  id: string,
  prefetch: boolean = false
): Promise<Piped | Record<'error' | 'message', string>> {

  const { invidious, piped, proxy, status } = store.api;
  const { fallback, hls } = store.player;

  const fetchDataFromPiped = (
    api: string
  ) => fetch(`${api}/streams/${id}`)
    .then(res => res.json())
    .then(data => {
      if (state.HLS ? data.hls : data.audioStreams.length)
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
      subtitles: data.captions.map(c => ({
        name: c.label,
        url: c.url
      })),
      relatedStreams: data.recommendedVideos.map(v => ({
        url: '/watch?v=' + v.videoId,
        title: v.title,
        uploaderName: v.author,
        duration: v.lengthSeconds,
        uploaderUrl: v.authorUrl,
        type: 'stream'
      })),
      videoStreams: data.adaptiveFormats.filter((f) => f.type.startsWith('video')).map(v => ({
        url: v.url,
        quality: v.quality,
        resolution: v.resolution,
        codec: v.type
      })),
      audioStreams: data.adaptiveFormats.filter((f) => f.type.startsWith('audio')).map((v) => ({
        bitrate: parseInt(v.bitrate),
        codec: v.encoding || (v.type.includes('webm') ? 'opus' : 'aac'),
        contentLength: parseInt(v.clen),
        quality: Math.floor(parseInt(v.bitrate) / 1024) + ' kbps',
        mimeType: v.type,
        url: v.url
      }))
    }));

  const emergency = (e: Error) =>
    (!prefetch && fallback) ?
      fetchDataFromPiped(fallback)
        .catch(() => e) : e;

  const useInvidious = (index = 0): Promise<Piped> => fetchDataFromInvidious(invidious[index])
    .catch(e => {
      if (index + 1 === invidious.length)
        return emergency(e);
      else return useInvidious(index + 1);
    });

  const usePiped = (src = piped, index = 0): Promise<Piped> => fetchDataFromPiped(src[index])
    .catch(() => {
      if (index + 1 === src.length)
        return useInvidious();
      else return usePiped(src, index + 1);
    });

  const useHls = () => Promise
    .allSettled((hls.api.length ? hls.api : piped).map(fetchDataFromPiped))
    .then(res => {
      const ff = res.filter(r => r.status === 'fulfilled');
      hls.manifests.length = 0;

      ff.forEach(r => {
        if (r.value.hls) {
          hls.manifests.push(r.value.hls);
        }
      });

      return ff[0].value || { message: 'No HLS sources are available.' };
    });

  const useLocal = async () => await import('./localExtraction.ts').then(mod => mod.fetchDataFromLocal(id));
  
  if (location.port === '9999')
    return useLocal();
  if (state.HLS)
    return useHls();
  
  switch (status) {
    case 'U':
      return usePiped(piped);
    case 'P':
      return usePiped(proxy);
    case 'I':
      return useInvidious();
    case 'N':
      return usePiped(['']);
  }
}

