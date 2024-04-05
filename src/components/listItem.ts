import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { getSaved } from "../lib/utils";

@customElement('list-item')
export class ListItem extends LitElement {

  @state() unravel = '0';
  @property() title!: string;
  @property() stats!: string;
  @property() thumbnail!: string;
  @property() uploader_data!: string;

  handleError() {
    this.thumbnail = this.thumbnail.includes('rj') ? this.thumbnail.replace('rj', 'rw') : '/logo192.png';
  }

  handleLoad(e:Event) {
    this.unravel = '1';
    if ((e.target as HTMLImageElement).naturalHeight === 90)
      this.thumbnail = this.thumbnail
        .replace('_webp', '')
        .replace('webp', 'jpg')
  }

  render() {
    return html`
        <img
        style=${'opacity:' + this.unravel}
        loading=${getSaved('lazyImg') ? 'lazy' : 'eager'}
        src=${this.thumbnail}
        @error=${this.handleError}
        @load=${this.handleLoad}
        />
        <div style=${'opacity:' + this.unravel}>
          <p id='title'>${this.title}</p>
          <p id='uData'>${this.uploader_data}</p>
          <p id='stats'>${this.stats}</p>
        </div>
      `;
  }

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
}

