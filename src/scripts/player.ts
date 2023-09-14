export default function player() {
  function setMetaData(thumbnail: string, id: string, streamName: string, authorName: string, authorUrl: string) {

    if (getSaved('img')) {
      save('img', thumbnail)
      thumbnail = null;
    } else img.src = thumbnail;

    title.href = `https://youtube.com/watch?v=${id}`;
    title.textContent = streamName;
    author.href = `https://youtube.com${authorUrl}`;
    author.textContent = authorName;

    document.title = streamName + ' - ytify';

    if (thumbnail?.includes('maxres'))
      thumbnail = thumbnail.replace('maxres', 'hq');

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setPositionState(null);
      navigator.mediaSession.metadata = new MediaMetadata({
        title: streamName,
        artist: authorName,
        artwork: [
          { src: thumbnail, sizes: '96x96' },
          { src: thumbnail, sizes: '128x128' },
          { src: thumbnail, sizes: '192x192' },
          { src: thumbnail, sizes: '256x256' },
          { src: thumbnail, sizes: '384x384' },
          { src: thumbnail, sizes: '512x512' },
        ]
      });
    }
  }
}
