import { hostResolver } from '../lib/utils';
import './ListItem.css';

import { createSignal } from 'solid-js';

export default function ListItem(
  title: string,
  stats: string,
  thumbnail: string,
  uploader_data: string,
  url: string,
  imgLoading: 'eager' | 'lazy',
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
      class='listItem ravel'
      href={hostResolver(url)}
      data-url={url}

    >
      <img
        loading={imgLoading}
        src={getThumbnail()}
        onError={handleError}
        onLoad={handleLoad}
      />
      <div>
        <p class="title">{title}</p>
        <p class="uData">{uploader_data}</p>
        <p class="stats">{stats}</p>
      </div>
    </a>
  );
}
