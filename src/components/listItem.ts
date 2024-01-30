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

    #title {
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
  @property() title!: string;
  @property() stats!: string;
  @property() thumbnail!: string;
  @property() uploader_data!: string;

  render() {

    let img = blankImage;

    if (!getSaved('img')) {
      const origin = new URL(this.thumbnail).origin;
      if (origin.includes('kavin'))
        // remove kavin's modifications
        img = this.thumbnail.replace('/ytc', '').replace(/&qhash=.{8}$/, '');
      // proxy through the selected instance
      img = this.thumbnail.replace(origin,
        thumbnailProxies.value);
    }
    return html`
        <img
        loading='lazy'
        src=${img}
        @error=${() => this.img.src = '/logo192.png'}
        />
        <div>
          <p id='title'>${this.title}</p>
          <p id='uData'>${this.uploader_data}</p>
          <p id='stats'>${this.stats}</p>
        </div>
      `;
  }
}

