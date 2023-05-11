const stylesheet = `
		:host{
			display:flex;
			align-items:center;
			justify-content:space-between;
			font-weight:bold;
			font-size:1rem;
			margin-bottom:1rem;
			color : var(--border);
		}
		
    label {
      position: relative;
      display: inline-block;
      width: calc(2.5rem + 1px);
      height: calc(1.5rem + 1px);
    }

    /* The slider */
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
      -webkit-transition: 0.3s;
      transition: 0.3s;
      border-radius: 1rem;
      border:1px solid var(--border);
    }
    
    input {
    	display: none;
    }
    
    input:checked+span {
      background-color: var(--border);
    }
    
    input:checked+span:before {
      -webkit-transform: translateX(1rem);
      -ms-transform: translateX(1rem);
      transform: translateX(1rem);
    }`;


customElements.define('toggle-switch', class extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: "open" });

		const style = document.createElement('style');
		style.textContent = stylesheet;

		const slot = document.createElement('slot');

		const label = document.createElement('label');

		const input = document.createElement('input');
		input.type = 'checkbox';
		input.oninput = () => { this.click() }

		const span = document.createElement('span');
		label.append(input, span);

		this.shadowRoot.append(style, slot, label);
	}

	static get observedAttributes() {
		return ['checked']
	}

	attributeChangedCallback() {
		this.shadowRoot.querySelector('input').toggleAttribute('checked');
	}

});