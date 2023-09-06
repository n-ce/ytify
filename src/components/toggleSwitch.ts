const stylesheet = `
		:host{
			display: flex;
			align-items: center;
			font-weight: bold;
			font-size: 1rem;
			margin-bottom: 1rem;
			color: var(--text);
		}
		
    label {
      margin-left: auto;
      position: relative;
      display: inline-block;
      pointer-events: none;
      width: calc(2.5rem + 1px);
      height: calc(1.5rem + 1px);
    }
    
    span {
      cursor: pointer;
      inset: 0;
      background-color: var(--accent);
    }
    
    span:before {
      position: absolute;
      content: "";
      height: calc(1rem - 1px);
      width: calc(1rem - 1px);
      margin:0.25rem;
      background-color: var(--accent);
    }
    
    span,
    span:before{
      position: absolute;
      transition: 0.3s;
      border-radius: 1rem;
      border:var(--border);
    }
    
    input {
    	display: none;
    }
    
    input:checked+span {
      background-color: var(--border);
    }
    
    input:checked+span:before {
      transform: translateX(1rem);
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

});
