export default function toggleSwitch() {

  const stylesheet = `
		:host{
			display: flex;
			align-items: center;
			margin: 4vmin 0;
			color: var(--text);
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
    }
    
    span:before {
      position: absolute;
      content: "";
      height: calc(100% - 2.3vmin);
      width: 20%;
      margin:1vmin;
      background-color: var(--onBg);
    }
    
    span,
    span:before{
      position: absolute;
      transition: 0.3s;
      border-radius: var(--roundedness);
      border:var(--border);
    }
    
    input {
    	display: none;
    }
    
    input:checked+span {
      background-color: var(--text);
    }
    
    input:checked+span:before {
      transform: translateX(4.6vmin);
    }`;


  customElements.define('toggle-switch', class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });

      const style = document.createElement('style');
      style.textContent = stylesheet;

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
}