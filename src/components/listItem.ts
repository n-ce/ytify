import { $, blankImage, getSaved } from '../lib/utils';
import css from './listItem.css?inline';
customElements.define('list-item', class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const root = <ShadowRoot>this.shadowRoot;

    const style = $('style');
    style.textContent = css;

    const img = $('img');
    img.id = 'thumbnail';
    img.loading = 'lazy';
    img.onerror = () => img.src = blankImage;

    const div = $('div');

    const name = $('slot');

    const uploaderData = $('p');
    uploaderData.id = 'uData';

    const stats = $('p');
    stats.id = 'stats';
    div.append(name, uploaderData, stats);

    root.append(style, img, div);
  }

  connectedCallback() {
    const root = <ShadowRoot>this.shadowRoot;
    const data = <DOMStringMap>this.dataset;

    const thumbnail = <HTMLImageElement>root.getElementById('thumbnail');
    const uData = <HTMLParagraphElement>root.getElementById('uData');
    const stats = <HTMLParagraphElement>root.getElementById('stats');

    if (data.thumbnail && !getSaved('img'))
      thumbnail.src = data.thumbnail;
    else
      thumbnail.src = blankImage;

    if (data.uploaderData)
      uData.textContent = data.uploaderData;

    if (data.stats)
      stats.textContent = data.stats;

  }

})
