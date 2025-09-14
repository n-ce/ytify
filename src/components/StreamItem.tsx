import { Show, createSignal } from 'solid-js';
import './StreamItem.css';
import { config, player } from '../lib/utils';
import { generateImageUrl } from '../lib/utils/image';
import { playerStore, setPlayerStore, setStore } from '../lib/stores';

export default function(data: {
  id: string,
  title: string,
  author?: string,
  duration: string,
  href?: string,
  uploaded?: string,
  channelUrl?: string,
  views?: string,
  img?: string,
  draggable?: boolean,
  lastUpdated?: string,
  context?: 'search' | 'collection' | 'channel' | 'playlist'
}) {

  const [getImage, setImage] = createSignal('');

  let parent!: HTMLAnchorElement;


  function handleThumbnailLoad(e: Event) {
    const img = e.target as HTMLImageElement;
    const src = getImage();

    if (img.naturalWidth !== 120) {
      parent.classList.remove('ravel');
      return;
    }
    if (src.includes('webp'))
      setImage(src.replace('.webp', '.jpg').replace('vi_webp', 'vi'));
    else { // most likely been removed from yt so remove it 
      parent.classList.add('delete');
      parent.click();
    }
  }

  function handleThumbnailError() {

    const src = getImage();

    setImage(
      src.includes('vi_webp') ?
        src.replace('.webp', '.jpg').replace('vi_webp', 'vi') :
        '/logo192.png'
    );

    parent.classList.remove('ravel');
  }



  if (config.loadImage)
    setImage(generateImageUrl(data.img || data.id, 'mq'));

  return (
    <a
      class={'streamItem ' + (config.loadImage ? 'ravel' : '')}
      href={data.href}
      ref={parent}
      onclick={(e) => {
        e.preventDefault();

        if (!e.target.classList.contains('ri-more-2-fill')) {
          if (data.context === 'search') {
            setPlayerStore('stream', data);
            console.log(playerStore.stream);
          }
          player(data.id);
        }
        else {
          setStore('actionsMenu', {
            id: data.id,
            title: data.title,
            author: data.author || '',
            duration: data.duration,
            channelUrl: data.channelUrl || '',
            lastUpdated: data.lastUpdated || new Date().toISOString()
          });
        }
      }}
    >
      <span>
        <Show when={config.loadImage} fallback={data.duration}>
          <img
            crossorigin='anonymous'
            onerror={handleThumbnailError}
            onload={handleThumbnailLoad}
            src={getImage()}
          />
          <p class='duration'>{data.duration}</p>
        </Show>
      </span>
      <div class='metadata'>
        <p class='title'>{data.title}</p>
        <div class='avu'>
          <p class='author'>{data.author?.replace(' - Topic', '')}</p>
          <p class='viewsXuploaded'>{(data.views || '') + (data.uploaded ? ' • ' + data.uploaded.replace('Streamed ', '') : '')}</p>
        </div>
      </div>
      {data.draggable ?
        <i class="ri-draggable"></i> :
        <i class="ri-more-2-fill"></i>
      }
    </a>
  )
}
