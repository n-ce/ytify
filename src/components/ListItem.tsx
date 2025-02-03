import { hostResolver } from '../lib/utils';
import { store } from '../lib/store';
import './ListItem.css';
import { Show, createSignal } from 'solid-js';


export default function ListItem(data: {
  title: string,
  stats: string,
  thumbnail: string,
  uploader_data: string,
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
      class={'listItem ' + (store.loadImage ? 'ravel' : '')}
      href={hostResolver(data.url)}
      data-title={data.title}
      data-url={data.url}
      data-thumbnail={data.thumbnail}
      data-uploader={data.uploader_data}
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
        <p class="title">{data.title}</p>
        <p class="uData">{data.uploader_data}</p>
        <p class="stats">{data.stats}</p>
      </div>
    </a>
  );
}
