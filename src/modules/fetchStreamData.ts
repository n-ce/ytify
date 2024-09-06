export const getData = (
  id: string,
  apiUrl: string,
  signal: AbortSignal,
  useInvidious = false
) =>
  useInvidious ?
    fetchWithInvidious(id, apiUrl, signal) :
    fetchWithPiped(id, apiUrl, signal)


const fetchWithPiped = (
  id: string,
  apiUrl: string,
  signal: AbortSignal
) =>
  fetch(apiUrl + '/streams/' + id, { signal })
    .then(res => res.json())
    .then(data => {
      if ('audioStreams' in data)
        return data;
      else throw new Error(data.message);
    });

const fetchWithInvidious = (
  id: string,
  apiUrl: string,
  signal: AbortSignal
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
      audioStreams: data.
        adaptiveFormats.filter((f) => f.type.startsWith('audio')).map((v) => ({
          bitrate: v.bitrate,
          codec: v.encoding,
          contentLength: v.clen,
          quality: Math.floor(v.bitrate / 1024) + ' kbps',
          mimeType: v.type,
          url: v.url.replace(new URL(v.url).origin, apiUrl)
        }))
    }));
