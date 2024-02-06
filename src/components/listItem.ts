import { LitElement, css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
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
  
    img, div{
     	opacity: 0;
      transition: all 0.3s;
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
  @state() unravel = '0';
  @property() title!: string;
  @property() stats!: string;
  @property() thumbnail!: string;
  @property() uploader_data!: string;

  render() {
    const img = getSaved('img') ?
      blankImage :
      thumbnailProxies.value + this.thumbnail;

    return html`
        <img
        style=${'opacity:' + this.unravel}
        loading='lazy'
        src=${img}
        @error=${() => this.img.src = '/logo192.png'}
        @load=${() => this.unravel = '1'}
        />
        <div style=${'opacity:' + this.unravel}>
          <p id='title'>${this.title}</p>
          <p id='uData'>${this.uploader_data}</p>
          <p id='stats'>${this.stats}</p>
        </div>
      `;
  }
}

