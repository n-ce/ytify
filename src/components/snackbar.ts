import { $ } from '../lib/utils';
import css from './snackbar.css?inline';

customElements.define('snack-bar',
  class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      const root = <ShadowRoot>this.shadowRoot;

      const style = $('style');
      style.textContent = css;

      const slot = $('slot');
      root.append(style, slot);
    }
    connectedCallback(clear = () => this.remove()) {
      this.onclick = clear;
      setTimeout(clear, 9e3);
    }
  })
