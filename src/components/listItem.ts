
import { blankImage, getSaved } from '../lib/utils';
import css from './listItem.css?inline';
customElements.define('list-item', class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = css;

    const img = document.createElement('img');
    img.id = 'thumbnail';
    img.src = blankImage;

    const div = document.createElement('div');

    const name = document.createElement('slot');

    const uploaderData = document.createElement('p');
    uploaderData.id = 'uData';

    const stats = document.createElement('p');
    stats.id = 'stats';
    div.append(name, uploaderData, stats);

    this.shadowRoot?.append(style, img, div);

  }
  connectedCallback() {
    const root = this.shadowRoot;
    const data = this.dataset;
    if (!root || !data) return;

    const thumbnail = <HTMLImageElement>root.getElementById('thumbnail');
    const uData = <HTMLParagraphElement>root.getElementById('uData');
    const stats = <HTMLParagraphElement>root.getElementById('stats');

    if (data.thumbnail && !getSaved('img'))
      thumbnail.src = data.thumbnail;

    if (data.uploaderData)
      uData.textContent = data.uploaderData;

    if (data.stats)
      stats.textContent = data.stats;

  }

})
