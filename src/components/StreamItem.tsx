import { Show, createSignal } from 'solid-js';
import './StreamItem.css';
import { getApi, getSaved } from '../lib/utils';
import { generateImageUrl } from '../lib/imageUtils';
import { instanceSelector } from '../lib/dom';


export default function StreamItem(data: {
  id: string,
  title: string,
  author: string,
  duration: string,
  href?: string,
  uploaded?: string,
  channelUrl?: string,
  views?: string,
  img?: string,
  draggable?: boolean
}) {

  const [tsrc, setTsrc] = createSignal('');
  const s = getSaved('imgLoad');
  const showImage = (s === 'off') ? undefined : s ? 'lazy' : 'eager';

  let parent!: HTMLAnchorElement;


  function handleThumbnailLoad(e: Event) {
    const img = e.target as HTMLImageElement;
    const t = tsrc();

    if (img.naturalWidth !== 120) {
      parent.classList.remove('ravel');
      return;
    }
    if (t.includes('webp'))
      setTsrc(t.replace('.webp', '.jpg').replace('vi_webp', 'vi'));
    else { // most likely been removed from yt so remove it 
      parent.classList.add('delete');
      parent.click();
    }
  }

  function handleThumbnailError() {

    const index = instanceSelector.selectedIndex;
    const currentImgPrxy = getApi('image', index);
    const nextImgPrxy = getApi('image', index + 1);
    const t = tsrc();

    parent.classList.remove('ravel');


    if (!t.includes(currentImgPrxy)) return;

    setTsrc(t.replace(currentImgPrxy, nextImgPrxy));
  }

  if (showImage)
    setTsrc(generateImageUrl(data.img || data.id, 'mq'));

  return (
    <a
      class={'streamItem ' + (showImage ? 'ravel' : '')}
      href={data.href}
      ref={parent}
      data-id={data.id}
      data-title={data.title}
      data-author={data.author}
      data-channel_url={data.channelUrl}
      data-duration={data.duration}
      data-thumbnail={tsrc()}
    >
      <span>
        <Show when={showImage}>
          <img
            loading={showImage}
            crossorigin='anonymous'
            onerror={handleThumbnailError}
            onload={handleThumbnailLoad}
            src={tsrc()}
          />
        </Show>
        <p class='duration'>{data.duration}</p>
      </span>
      <div class='metadata'>
        <p class='title'>{data.title}</p>
        <div class='avu'>
          <p class='author'>{data.author}</p>
          <p class='viewsXuploaded'>{(data.views || '') + (data.uploaded ? ' • ' + data.uploaded.replace('Streamed ', '') : '')}</p>
        </div>
      </div>
      <i class={`ri-${data.draggable ? 'draggable' : 'more-2-fill'}`}></i>
    </a>
  )
}
