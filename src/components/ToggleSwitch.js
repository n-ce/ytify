const stylesheet = `
		:host{
			display:flex;
			align-items:center;
			font-weight:bold;
			font-size:0.8rem;
			color : var(--border);
			border-radius: 2rem 1rem 1rem 2rem;
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
      -webkit-transition: 0.5s;
      transition: 0.5s;
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

class ToggleSwitch extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: "open" });

		const style = document.createElement('style');
		style.textContent = stylesheet;

		const label = document.createElement('label');

		const input = document.createElement('input');
		input.type = 'checkbox';

		const span = document.createElement('span');
		label.append(input, span);

		const slot = document.createElement('slot');

		this.shadowRoot.append(style, label, slot);
	}

	connectedCallback() {
		this.shadowRoot.lastChild.onslotchange = () => {
			this.style.width = `calc(2.5rem + 1px + ${this.innerText.length}ch)`;
		}
		const checkbox = this.shadowRoot.querySelector('input');
		checkbox.oninput = () => {
			checkbox.checked ?
				this.setAttribute('filter','music_songs') :
				this.setAttribute('filter','all') ;
		}
	}

}

customElements.define('toggle-switch', ToggleSwitch);