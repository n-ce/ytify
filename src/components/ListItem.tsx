import { hostResolver } from '../lib/utils';
import { state } from '../lib/store';
import { html } from 'uhtml';
import './ListItem.css';


export default function(data: {
  title: string,
  stats: string,
  thumbnail: string,
  uploader_data: string,
  url: string,
}) {

  let img!: HTMLImageElement;

  function unravel() {
    img.parentElement!.classList.remove('ravel');
  }
  function handleError() {
    unravel();
    img.src = '/logo192.png';
  }

  return html`
    <a
      class=${'listItem ' + (state.loadImage ? 'ravel' : '')}
      href=${hostResolver(data.url)}
      data-title=${data.title}
      data-url=${data.url}
      data-thumbnail=${data.thumbnail}
      data-uploader=${data.uploader_data}
    >
      ${state.loadImage ? html`
        <img
          ref=${(_: HTMLImageElement) => { img = _; }}
          src=${data.thumbnail}
          @error=${handleError}
          @load=${unravel}
        />
      `: ''}
      <div>
        <p class="title">${data.title}</p>
        <p class="uData">${data.uploader_data}</p>
        <p class="stats">${data.stats}</p>
      </div>
    </a>
  `;
}
