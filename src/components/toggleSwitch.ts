import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";


@customElement('toggle-switch')
export class ToggleSwitch extends LitElement {

  static styles = css` 
  :host {
    display: flex;
    align-items: center;
    margin: 4vmin 0;
    color: inherit;
  }

  label {
    margin-left: auto;
    position: relative;
    display: inline-block;
    pointer-events: none;
    width: 9vmin;
    height: 6vmin;
  }

  span {
    cursor: pointer;
    inset: 0;
    background-color: var(--onBg);
    border-radius: var(--roundness);
    border: var(--border);
    transform: scale(1.1);
  }

  span:before {
    position: absolute;
    content: "";
    height: calc(100% - 2.1vmin);
    aspect-ratio:1;
    margin: 1vmin;
    background-color: var(--text);
    border-radius: calc(var(--roundness) - 0.5vmin);
    box-shadow:var(--shadow);
  }

  span,
  span:before {
    position: absolute;
    transition: 0.3s;
  }

  input {
    display: none;
  }

  input:checked+span {
    background-color: var(--bg);
  }

  input:checked+span:before {
    margin-left:-0.4vmin;
    transform: translateX(4.6vmin);
  }
  `;

  @property({ type: Boolean }) checked = false;

  constructor() {
    super();
    this.addEventListener('click', () => {
      this.checked = !this.checked;
      this.toggleAttribute('checked');
    });
  }

  render() {
    return html`
      <slot></slot>
      <label>
        <input type='checkbox' .checked=${this.checked}></input>
        <span></span>
      </label>
      `;
  }
}

