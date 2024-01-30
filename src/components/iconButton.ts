import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement('i-btn')
export class IconButton extends LitElement {

  static styles = css`
@import 'remixicon.css';
  button {
    border: var(--border);
    border-radius: var(--roundness);
    background: var(--text);
    color: var(--bg);
    font-family: inherit;
    font-size: inherit;
    padding: 1vmin 2vmin;
    margin: 1vmin 2vmin;
    transition: all 0.3s ease;
    user-select: none;
  }
  
  button:hover {
    background-color: var(--bg);
    color: var(--text);
  }
  
  button:active {
    transform: scale(0.8);
  }
  `;

  @property() icon!: string;
  @property() name!: string;

  render() {
    return html`
        <button>
          <i class=${this.icon}></i> ${this.name}
        </button>
      `;
  }
}
