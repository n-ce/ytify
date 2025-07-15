export async function fetchDataFromLocal(id: string): Promise<Piped & { captions: [], videoStreams: [] }> {
  const res = await fetch('http://localhost:9999/streams/' + id);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: `HTTP error! status: ${res.status}` }));
    throw new Error(`Local/production fetch failed: ${errorData.message || 'Unknown error'}`);
  }

  const { videoDetails, streamingData, captions } = await res.json();

  if (!videoDetails || !streamingData)
    throw new Error('Invalid local data structure: missing videoDetails or streamingData.');

  const audioStreams = streamingData.adaptiveFormats
    ? streamingData.adaptiveFormats
      .filter((f: any) => f.mimeType?.startsWith('audio'))
      .map((f: any) => ({
        url: f.url,
        bitrate: parseInt(f.bitrate),
        codec: f.mimeType.includes('opus') ? 'opus' : (f.mimeType.includes('aac') ? 'aac' : 'unknown'),
        contentLength: parseInt(f.contentLength || '0'),
        quality: f.audioQuality || `${Math.floor(parseInt(f.bitrate) / 1024)} kbps`,
        mimeType: f.mimeType,
      }))
    : [];

  const videoStreams = streamingData.adaptiveFormats
    ? streamingData.adaptiveFormats
      .filter((f: any) => f.mimeType?.startsWith('video'))
      .map((f: any) => ({
        url: f.url,
        quality: f.qualityLabel || f.quality,
        resolution: `${f.width || ''}x${f.height || ''}`.replace(/^x|x$/, ''),
        type: f.mimeType,
      }))
    : [];

  const captionTracks = captions?.playerCaptionsTracklistRenderer?.captionTracks
    ? captions.playerCaptionsTracklistRenderer.captionTracks.map((track: any) => ({
      baseUrl: track.baseUrl,
      name: track.name?.runs?.[0]?.text || 'Unknown',
      vssId: track.vssId,
      languageCode: track.languageCode,
      kind: track.kind,
      isTranslatable: track.isTranslatable,
    }))
    : [];

  return ({
    instance: 'Local Extractor',
    title: videoDetails.title,
    uploader: videoDetails.author,
    duration: parseInt(videoDetails.lengthSeconds),
    uploaderUrl: `/channel/${videoDetails.channelId}`,
    livestream: videoDetails.isLiveContent,
    captions: captionTracks,
    relatedStreams: [],
    videoStreams: videoStreams,
    audioStreams: audioStreams,
    hls: streamingData.hlsManifestUrl || undefined,
  });

}
