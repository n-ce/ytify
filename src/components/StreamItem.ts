import { html } from "uhtml";
import { store } from "../lib/store";
import { generateImageUrl } from "../lib/imageUtils";
import './StreamItem.css';

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
  draggable?: boolean
}) {
  let anchor!: HTMLAnchorElement;
  let imgsrc = '';

  function handleThumbnailLoad(e: Event) {
    const img = e.target as HTMLImageElement;

    if (img.naturalWidth !== 120) {
      anchor.classList.remove('ravel');
      return;
    }
    if (imgsrc.includes('webp'))
      img.src = imgsrc.replace('.webp', '.jpg').replace('vi_webp', 'vi');
    else { // most likely been removed from yt so remove it 
      anchor.classList.add('delete');
      anchor.click();
    }
  }

  function handleThumbnailError(e: Event) {
    const img = e.target as HTMLImageElement;
    img.src =
      imgsrc.includes('vi_webp') ?
        imgsrc.replace('.webp', '.jpg').replace('vi_webp', 'vi') :
        '/logo192.png';

    anchor.classList.remove('ravel');
  }


  if (store.loadImage)
    imgsrc = generateImageUrl(data.img || data.id, 'mq');


  return html`
    
    <a
      class=${'streamItem ' + (store.loadImage ? 'ravel' : '')}
      href=${data.href}
      ref=${(_: HTMLAnchorElement) => { anchor = _ }}
      data-id=${data.id}
      data-title=${data.title}
      data-author=${data.author}
      data-channel_url=${data.channelUrl}
      data-duration=${data.duration}
      data-thumbnail=${imgsrc}
    >
      <span>
      
        ${store.loadImage ?

      html`<img
            crossorigin='anonymous'
            @error=${handleThumbnailError}
            @load=${handleThumbnailLoad}
            src=${imgsrc}
          />
          <p class='duration'>${data.duration}</p>` :
      data.duration
    }          

      </span>
      <div class='metadata'>
        <p class='title'>${data.title}</p>
        <div class='avu'>
          <p class='author'>${data.author?.replace(' - Topic', '')}</p>
          <p class='viewsXuploaded'>${(data.views || '') + (data.uploaded ? ' • ' + data.uploaded.replace('Streamed ', '') : '')}</p>
        </div>
      </div>
      <i class=${'ri-' + (data.draggable ? 'draggable' : 'more-2-fill')}></i>
    </a>
  `;
}
