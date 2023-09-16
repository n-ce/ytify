import { numFormatter } from '../lib/utils';
import css from './playlistXchannelItem.css?inline';
customElements.define('channel-item', class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = css;

    const img = document.createElement('img');
    img.id = 'thumbnail';

    const div = document.createElement('div');

    const name = document.createElement('slot');

    const desc = document.createElement('p');
    desc.id = 'desc';

    const subs = document.createElement('p');
    subs.id = 'subs';
    div.append(name, desc, subs);

    this.shadowRoot?.append(style, img, div);

  }
  connectedCallback() {
    const root = this.shadowRoot;
    const data = this.dataset;
    if (!root || !data) return;

    const thumbnail = <HTMLImageElement>root.getElementById('thumbnail');
    const desc = <HTMLParagraphElement>root.getElementById('desc');
    const subs = <HTMLParagraphElement>root.getElementById('subs');

    if (data.thumbnail)
      thumbnail.src = data.thumbnail;

    if (data.description && data.description !== 'null')
      desc.textContent = data.description;


    if (data.subscribers && data.subscribers !== '-1')
      subs.textContent = numFormatter(parseInt(data.subscribers)) + ' subscribers';

  }

})
