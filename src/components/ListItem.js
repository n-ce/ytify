class ListItem extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: "open" })
		this.shadowRoot.innerHTML = `
		  <style>
		  :host {
		  	height: 5rem;
		  	user-select: none;
		  	display: flex;
		  }
		  img {
		  	border-radius: 0.5rem;
		  	height: 4.8rem;
		  	margin: 0.1rem 0.4rem;
		  }
		  div {
		  	overflow: scroll;
		  }
		  slot {
		  	font-weight: bold;
		  	display: flex;
		  	max-height: 4rem;
		  	overflow: scroll;
		  }
		  p {
		  	font-size: 0.8rem;
		  	margin:0;
		  }
		  </style>
		  <img loading="lazy">
		  <div>
		  	<slot></slot>
		  	<p></p>
		  </div>
		`;
	}
	connectedCallback() {
		this.shadowRoot.querySelector('img').src = this.dataset.thumbnail;
		this.shadowRoot.querySelector('p').textContent = this.dataset.author;
	}
}
customElements.define("list-item", ListItem)
