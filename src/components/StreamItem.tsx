import { createSignal } from 'solid-js';
import './StreamItem.css';
import { instanceSelector } from '../lib/dom';
import { getApi, getSaved } from '../lib/utils';
import { generateImageUrl } from '../lib/imageUtils';


export default function StreamItem(
  id: string,
  href: string,
  title: string,
  author: string,
  duration: string,
  uploaded: string | undefined,
  channelUrl: string,
  views: string | undefined = '',
  imgLoad: boolean = (getSaved('img') ? false : true),
  imgLoadStyle: 'eager' | 'lazy' = (getSaved('lazyImg') ? 'lazy' : 'eager'),
  imgYTM: string = ''
) {

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

  if (imgLoad)
    setTsrc(generateImageUrl(imgYTM || id, 'mq'));

  return (
    <a
      class='streamItem ravel'
      href={href}
      ref={parent}
      data-id={id}
      data-title={title}
      data-author={author}
      data-channel_url={channelUrl}
      data-duration={duration}
    >
      <span>
        <img
          class='thumbnail'
          loading={imgLoadStyle}
          crossorigin='anonymous'
          onerror={handleThumbnailError}
          onload={handleThumbnailLoad}
          src={tsrc()}
        />
        <p class='duration'>{duration}</p>
      </span>
      <div class='metadata'>
        <p class='title'>{title}</p>
        <div class='avu'>
          <p class='author'>{author}</p>
          <p class='viewsXuploaded'>{(views || '') + (uploaded ? ' • ' + uploaded.replace('Streamed ', '') : '')}</p>
        </div>
      </div>
    </a>
  )
}
