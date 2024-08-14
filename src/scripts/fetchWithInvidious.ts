import { getApi } from "../lib/utils";

export const fetchWithInvidious = (id: string) =>
  fetch(`${getApi('invidious')}/api/v1/videos/${id}`)
    .then(res => res.json())
    .then(data => ({
      title: data.title,
      uploader: data.author,
      duration: data.lengthSeconds,
      uploaderUrl: data.authorUrl,
      category: data.genre,
      liveStream: data.liveNow,
      audioStreams: data.adaptiveFormats.filter((f: any) => f.type.startsWith('audio')).map((v: any) => ({
        bitrate: v.bitrate,
        codec: v.encoding,
        contentLength: v.clen,
        quality: Math.floor(v.bitrate / 1024) + ' kbps',
        mimeType: v.type,
        url: v.url.replace(new URL(v.url).origin, getApi('invidious'))
      }))
    }))
