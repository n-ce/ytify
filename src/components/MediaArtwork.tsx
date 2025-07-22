import { setStore, store } from "../lib/store";

export default function() {

  let imgRef!: HTMLImageElement;

  function handler() {
    setStore('player', 'mediaArtwork',
      imgRef.src
        .replace('maxres', 'mq')
        .replace('.webp', '.jpg')
        .replace('vi_webp', 'vi')
    );
  }

  return (
    <img
      ref={imgRef}
      src={store.player.mediaArtwork}
      crossorigin="anonymous"
      alt={"Media Artwork for " + store.player.title}
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
