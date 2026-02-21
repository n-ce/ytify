import { config, hostResolver, generateImageUrl } from '@utils';
import './ListItem.css';
import { Show, createSignal } from 'solid-js';
import { getList, setListStore } from '@stores';

export default function(data: YTListItem) {

  const [getThumbnail, setThumbnail] = createSignal(generateImageUrl(data.img, ''));
  let img!: HTMLImageElement;

  function unravel() {
    img.parentElement!.classList.remove('ravel');
  }
  function handleError() {
    unravel();
    setThumbnail('/logo192.png');
  }

  const url = `/${data.type}/${data.id}`;
  const uploaderData = (data as YTPlaylistItem | YTAlbumItem).author || '';
  const stats = (data as YTChannelItem | YTArtistItem).subscribers || (data as YTChannelItem | YTPlaylistItem).videoCount || (data as YTAlbumItem).year || '';

  return (
    <a
      class={'listItem card card--interactive ' + (config.loadImage ? 'ravel' : '')}
      href={hostResolver(url)}
      onclick={(e) => {
        e.preventDefault();
        setListStore('img', data.img);
        getList(data.id, data.type);
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
        <p class="title truncate">{data.name}</p>
        <p class="uData truncate">{uploaderData}</p>
        <p class="stats truncate">{stats}</p>
      </div>
    </a >
  );
}
