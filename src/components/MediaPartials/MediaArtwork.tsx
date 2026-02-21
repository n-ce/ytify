import { setPlayerStore, playerStore } from "@stores";

export default function() {

  let imgRef!: HTMLImageElement;

  function handler() {
    setPlayerStore('mediaArtwork',
      imgRef.src
        .replace('maxres', 'mq')
        .replace('.webp', '.jpg')
        .replace('vi_webp', 'vi')
    );
  }

  return (
    <img
      ref={imgRef}
      src={playerStore.mediaArtwork}
      crossorigin="anonymous"
      alt={"Media Artwork for " + playerStore.stream.title}
      onclick={() => {
        if (playerStore.isMusic)
          setPlayerStore('immersive', !playerStore.immersive);
        else
          setPlayerStore('isWatching', !playerStore.isWatching);
      }}
      onload={() => {
        if (imgRef.naturalWidth === 120)
          handler();
      }}
      onerror={() => {
        if (imgRef.src.includes('max'))
          handler();
      }}
    />
  )
}
