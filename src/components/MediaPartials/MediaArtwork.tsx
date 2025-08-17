import { setPlayerStore, playerStore } from "../../lib/stores";

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
      alt={"Media Artwork for " + playerStore.title}
      onclick={() => {
        setPlayerStore('immersive', !playerStore.immersive);
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
