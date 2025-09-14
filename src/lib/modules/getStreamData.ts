import { store } from "../stores";

export default async function(
  id: string,
  prefetch: boolean = false,
  signal?: AbortSignal
): Promise<Piped | Record<'error' | 'message', string>> {

  const { invidious, piped, status, fallback } = store.api;

  const fetchDataFromPiped = (
    api: string
  ) =>
    fetch(`${api}/streams/${id}`, { signal })
      .then(res => res.json())
      .then(data => {
        if (data.audioStreams.length)
          return data;
        else throw new Error(data.message);
      });

  const fetchDataFromInvidious = (
    api: string
  ) => fetch(`${api}/api/v1/videos/${id}`, { signal })
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

  const useInvidious = (index = 0): Promise<Piped> =>
    (status === 'N') ?
      Promise.allSettled(invidious.map(fetchDataFromInvidious))
        .then(res => {
          const ff = res.find(r => r.status === 'fulfilled');
          if (ff?.value) return ff.value;
          return emergency(Error('No Invidious sources are available'));
        }) :
      fetchDataFromInvidious(invidious[index])
        .catch(e => {
          if (index + 1 === invidious.length)
            return emergency(e);
          else return useInvidious(index + 1);
        });


  const usePiped = (index = 0): Promise<Piped> =>
    fetchDataFromPiped(piped[index])
      .catch(() => {
        if (index + 1 === piped.length)
          return useInvidious();
        else return usePiped(index + 1);
      });

  return status === 'P' ? usePiped() :
    status === 'I' ? useInvidious() :
      Promise.allSettled(piped.map(fetchDataFromPiped))
        .then(res => {
          const ff = res.find(r => r.status === 'fulfilled');
          if (ff?.value) return ff.value;
          return useInvidious();
        });
}
