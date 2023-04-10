const template = document.createElement("template");

template.innerHTML = `
  <style>
  :host {
  	display:flex;
  	height:5rem;
  	align-items:center;
  	user-select:none;
  }
  h3,h6{
  	margin:0;
  	padding:0;
  }
  img {
  	border-radius:0.5rem;
	width:50%;
  	margin: 0.1rem 0.4rem 0.1rem 0.4rem;
  }
  div {
  	height:100%;
  	overflow:scroll;
  }
  h3{
  	height:75%;
  	overflow:scroll;
  }
  </style>
  <img loading="lazy">
  <div>
  	<h3>
  		<slot><slot>
  	</h3>
  	<h6></h6>
  </div>
`;

class ListItem extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: "open" })
		this.shadowRoot.appendChild(template.content.cloneNode(true));
	}
	connectedCallback() {
		this.shadowRoot.querySelector('img').src = this.dataset.thumbnail;
		this.shadowRoot.querySelector('h6').textContent = this.dataset.author;
	}
}
customElements.define("list-item", ListItem)
