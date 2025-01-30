import { hostResolver } from '../lib/utils';
import { store } from '../lib/store';
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
      class={'listItem ' + (store.loadImage ? 'ravel' : '')}
      href={hostResolver(url)}
      data-title={title}
      data-url={url}
      data-thumbnail={thumbnail}
      data-uploader={uploader_data}
    >
      <Show when={store.loadImage}>
        <img
          ref={img}
          src={getThumbnail()}
          onError={handleError}
          onLoad={unravel}
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
