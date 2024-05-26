import { hostResolver } from '../lib/utils';
import './ListItem.css';
import { Show, createSignal } from 'solid-js';

// workaround "cannot access 'getSaved' before initialization"
const s = localStorage.getItem('imgLoad');
const showImage = (s === 'off') ? undefined : s ? 'lazy' : 'eager';

export default function ListItem(
  title: string,
  stats: string,
  thumbnail: string,
  uploader_data: string,
  url: string,
) {
  const [getThumbnail, setThumbnail] = createSignal(thumbnail);

  const handleError = () =>
    setThumbnail(
      getThumbnail().includes('rj')
        ? getThumbnail().replace('rj', 'rw')
        : '/logo192.png'
    );

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
