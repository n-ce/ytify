import css from '../components/toggleSwitch.css?inline';

customElements.define('toggle-switch', class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = css;

    const label = document.createElement('label');

    const input = document.createElement('input');
    input.type = 'checkbox';

    this.addEventListener('click', () => {
      input.checked = !input.checked;
    });

    label.append(input, document.createElement('span'));

    this.shadowRoot?.append(style, document.createElement('slot'), label);
  }

  static get observedAttributes() {
    return ['checked']
  }

  attributeChangedCallback() {
    this.shadowRoot?.querySelector('input')?.toggleAttribute('checked');
  }

})
