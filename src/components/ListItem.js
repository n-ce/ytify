const styles = `
		:host {
			height: 5rem;
			user-select: none;
			display: flex;
			overflow: hidden;
		}
		img {
			border-radius: 0.5rem;
			height: 4.8rem;
			margin: 0.1rem 0.4rem;
		}
		slot {
			font-weight: bold;
			display: flex;
			max-height: 3.9rem;
			overflow: hidden;
		}
		p {
			font-size: 0.8rem;
			max-height: 1rem;
			margin: 0;
			overflow: hidden;
		}`;


customElements.define("list-item", class extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: "open" })
		const img = document.createElement('img');
		img.loading = 'lazy';

		const slot = document.createElement('slot');
		const p = document.createElement('p');
		const div = document.createElement('div');
		div.append(slot, p);

		const style = document.createElement('style');
		style.textContent = styles;

		this.shadowRoot.append(style, img, div);
	}
	connectedCallback() {
		if (!localStorage.getItem('img'))
			this.shadowRoot.querySelector('img').src = this.dataset.thumbnail;
		this.shadowRoot.querySelector('p').textContent = this.dataset.author;
	}
})
