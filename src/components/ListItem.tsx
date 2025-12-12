import { config, hostResolver } from '@lib/utils';
import './ListItem.css';
import { Show, createSignal } from 'solid-js';
import { getList, setListStore } from '@lib/stores';

export default function(data: {
  title: string,
  stats: string,
  thumbnail: string,
  uploaderData: string,
  url: string,
}) {

  const [getThumbnail, setThumbnail] = createSignal(data.thumbnail);
  let img!: HTMLImageElement;

  function unravel() {
    img.parentElement!.classList.remove('ravel');
  }
  function handleError() {
    unravel();
    setThumbnail('/logo192.png');
  }

  return (
    <a
      class={'listItem ' + (config.loadImage ? 'ravel' : '')}
      href={hostResolver(data.url)}
      onclick={(e) => {
        e.preventDefault();
        setListStore('thumbnail', data.thumbnail);


        if (data.url.startsWith('/channel'))
          getList(data.url.slice(9), 'channel');
        else if (data.url.includes('MPREb'))
          getList(data.url.split('/').pop()!, 'album')
        else if (data.url.startsWith('/playlist')) {
          getList(data.url.slice(10), 'playlist')
        }
        else getList(data.url.slice(8), 'artist');
      }}
    >
      <Show when={config.loadImage}>
        <img
          ref={img}
          src={getThumbnail()}
          onError={handleError}
          onLoad={unravel}
        />
      </Show>
      <div>
        <p class="title">{data.title}</p>
        <p class="uData">{data.uploaderData}</p>
        <p class="stats">{data.stats}</p>
      </div>
    </a >
  );
}
