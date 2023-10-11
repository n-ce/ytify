import { blankImage, getSaved } from '../lib/utils';
import css from './listItem.css?inline';
customElements.define('list-item', class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const root = <ShadowRoot>this.shadowRoot;

    const style = document.createElement('style');
    style.textContent = css;

    const img = document.createElement('img');
    img.id = 'thumbnail';
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      img.src = blankImage;
    });
    img.addEventListener('load', () => {
      ['img', 'div'].forEach(_ => (<HTMLElement>root.querySelector(_)).style.opacity = '1');
    })

    const div = document.createElement('div');

    const name = document.createElement('slot');

    const uploaderData = document.createElement('p');
    uploaderData.id = 'uData';

    const stats = document.createElement('p');
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
