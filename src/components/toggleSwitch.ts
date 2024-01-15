import { $ } from '../lib/utils';
import css from '../components/toggleSwitch.css?inline';

let root: ShadowRoot;

customElements.define('toggle-switch', class extends HTMLElement {
  constructor() {
    super();
    root = this.attachShadow({ mode: 'open' });
    const style = $('style');
    style.textContent = css;

    const label = $('label');

    const input = $('input');
    input.type = 'checkbox';

    this.addEventListener('click', () => {
      input.checked = !input.checked;
      this.toggleAttribute('checked');
    });

    label.append(input, $('span'));

    root.append(style, $('slot'), label);
  }

  static get observedAttributes() {
    return ['checked']
  }

  attributeChangedCallback() {
    (<HTMLInputElement>root.querySelector('input')).toggleAttribute('checked');
  }
});
