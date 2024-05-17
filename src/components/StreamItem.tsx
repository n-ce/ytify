import { Show, createSignal } from 'solid-js';
import './StreamItem.css';
import { instanceSelector } from '../lib/dom';
import { getApi, getSaved } from '../lib/utils';
import { generateImageUrl } from '../lib/imageUtils';


export default function StreamItem(data: {
  id: string,
  title: string,
  author: string,
  duration: string,
  href?: string,
  uploaded?: string,
  channelUrl?: string,
  views?: string,
  imgLoad?: boolean,
  imgLoadStyle?: 'eager' | 'lazy',
  imgYTM?: string,
  draggable?: boolean
}) {

  const keys = Object.keys(data);

  if (!keys.includes('imgLoad'))
    data.imgLoad = getSaved('img') ? false : true;

  if (!keys.includes('imgLoadStyle'))
    data.imgLoadStyle = getSaved('lazyImg') ? 'lazy' : 'eager';


  const [tsrc, setTsrc] = createSignal('');

  let parent!: HTMLAnchorElement;


  function handleThumbnailLoad(e: Event) {
    const img = e.target as HTMLImageElement;
    const store = tsrc();

    if (img.naturalWidth !== 120) {
      parent.classList.remove('ravel');
      return;
    }
    if (store.includes('webp'))
      setTsrc(store.replace('.webp', '.jpg').replace('vi_webp', 'vi'));
    else { // most likely been removed from yt so remove it 
      parent.classList.add('delete');
      parent.click();
    }
  }

  function handleThumbnailError() {

    const index = instanceSelector.selectedIndex;
    const currentImgPrxy = getApi('image', index);
    const nextImgPrxy = getApi('image', index + 1);
    const store = tsrc();

    parent.classList.remove('ravel');


    if (!store.includes(currentImgPrxy)) return;

    setTsrc(store.replace(currentImgPrxy, nextImgPrxy));
  }

  if (data.imgLoad)
    setTsrc(generateImageUrl(data.imgYTM || data.id, 'mq'));

  return (
    <a
      class='streamItem ravel'
      href={data.href}
      ref={parent}
      data-id={data.id}
      data-title={data.title}
      data-author={data.author}
      data-channel_url={data.channelUrl}
      data-duration={data.duration}
    >
      <span>
        <img
          class='thumbnail'
          loading={data.imgLoadStyle}
          crossorigin='anonymous'
          onerror={handleThumbnailError}
          onload={handleThumbnailLoad}
          src={tsrc()}
        />
        <p class='duration'>{data.duration}</p>
      </span>
      <div class='metadata'>
        <p class='title'>{data.title}</p>
        <div class='avu'>
          <p class='author'>{data.author}</p>
          <p class='viewsXuploaded'>{(data.views || '') + (data.uploaded ? ' • ' + data.uploaded.replace('Streamed ', '') : '')}</p>
        </div>
      </div>
      <Show when={data.draggable}>
        <i class="ri-draggable"></i>
      </Show>
    </a>
  )
}
