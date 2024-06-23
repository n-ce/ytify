import { getApi, hostResolver } from '../lib/utils';
import { store } from '../store';
import './ListItem.css';
import { Show, createSignal } from 'solid-js';


export default function ListItem(
  title: string,
  stats: string,
  thumbnail: string,
  uploader_data: string,
  url: string,
) {
  const [getThumbnail, setThumbnail] = createSignal(thumbnail);
  const showImage = (store.loadImage === 'off') ? undefined : store.loadImage;

  function handleError(e: Event) {
    const img = e.target as HTMLImageElement;
    img.parentElement!.classList.remove('ravel');


    const index = (document.getElementById('instanceSelector') as HTMLSelectElement).selectedIndex;
    const currentImgPrxy = getApi('image', index);
    const nextImgPrxy = getApi('image', index + 1);
    const t = getThumbnail();

    setThumbnail(
      getThumbnail().includes('rj?')
        ? getThumbnail().replace('rj?', 'rw?')
        : t.includes(currentImgPrxy) ?
          setThumbnail(t.replace(currentImgPrxy, nextImgPrxy)) :
          '/logo192.png'
    );

  }




  function handleLoad(e: Event) {
    const img = e.target as HTMLImageElement;
    img.parentElement!.classList.remove('ravel');

    if (img.naturalHeight === 90)
      setThumbnail(getThumbnail().replace('_webp', '').replace('webp', 'jpg'));
  }


  return (
    <a
      class={'listItem ' + (showImage ? 'ravel' : '')}
      href={hostResolver(url)}
      data-url={url}
      data-thumbnail={thumbnail}
    >
      <Show when={showImage}>
        <img
          loading={showImage as 'lazy' | 'eager' | undefined}
          src={getThumbnail()}
          onError={handleError}
          onLoad={handleLoad}
        />
      </Show>
      <div>
        <p class="title">{title}</p>
        <p class="uData">{uploader_data}</p>
        <p class="stats">{stats}</p>
      </div>
    </a>
  );
}
