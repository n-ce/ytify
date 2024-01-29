/*
import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { blankImage, getSaved } from "../lib/utils";
import { thumbnailProxies } from "../lib/dom";


@customElement('list-item')
export class ListItem extends LitElement {

  static styles = css`
    :host {
      background-color: var(--onBg);
      height: 20vmin;
      width: calc(100% - 2vmin);
      margin-bottom: 1vmin;
      padding: 1vmin;
      border-radius: calc(var(--roundness) + 0.75vmin);
      display: flex;
    }

    p {
      margin: 0;
      padding: 0;
    }

    img {
      height: 100%;
      border-radius: var(--roundness);
    }
  
    div {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      margin-left: 1vmin;
    }

    slot {
      display: flex;
      height: 10vmin;
      font-size: medium;
      overflow: hidden;
    }
  
    #uData {
      font-size: small;
      height: 25%;
      overflow: hidden;
    }

    #stats {
      font-size: medium;
       height: 25%;
    }
  `;

  @query('img') img!: HTMLImageElement;
  @property()
  thumbnail!: string;
  uploader_data!: string;
  stats!: string;

  render() {
    return html`
        <img
        loading='lazy'
        src=${(getSaved('img') ? blankImage :
        this.thumbnail.replace(new URL(this.thumbnail).origin, thumbnailProxies.value))}
        @error=${() => this.img.src = '/logo192.png'}
        />
        <div>
          <slot></slot>
          <p id='uData'>${this.uploader_data}</p>
          <p id='stats'>${this.stats}</p>
        </div>
      `;
  }

}

*/


import { thumbnailProxies } from '../lib/dom';
import { $, blankImage, getSaved } from '../lib/utils';
import css from './listItem.css?inline';

customElements.define('list-item', class extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });

    const style = $('style');
    style.textContent = css;

    const img = $('img');
    img.id = 'thumbnail';
    img.loading = 'lazy';
    img.onerror = () => img.src = '/logo192.png';

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
    const data = this.getAttribute.bind(this);
    const x = (<ShadowRoot>this.shadowRoot).getElementById.bind(this.shadowRoot);

    (<HTMLParagraphElement>x('uData')).textContent = data('uploader_data') || '';
    (<HTMLParagraphElement>x('stats')).textContent = data('stats') || '';
    (<HTMLImageElement>x('thumbnail')).src =
      (data('thumbnail') && !getSaved('img')) ?
        (<string>data('thumbnail')).replace(new URL(<string>data('thumbnail')).origin, thumbnailProxies.value)
        :
        blankImage;
  }

})

