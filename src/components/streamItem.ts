import css from './streamItem.css?inline';
import { $, blankImage, getSaved, imgUrl } from '../lib/utils';


customElements.define('stream-item', class extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });

		const root = <ShadowRoot>this.shadowRoot;

		const style = $('style');
		style.textContent = css;

		const span = $('span');

		const thumbnail = $('img');
		thumbnail.crossOrigin = 'anonymous';
		thumbnail.id = 'thumbnail';
		thumbnail.loading = 'lazy';
		thumbnail.addEventListener('load', () => {
			if (thumbnail.naturalWidth !== 120)
				return ['span', '#metadata'].forEach(_ => (<HTMLElement>root.querySelector(_)).style.opacity = '1');
			if (thumbnail.src.includes('webp'))
				thumbnail.src = thumbnail.src.replace('.webp', '.jpg').replace('vi_webp', 'vi')
			else {
				// total annihilation
				this.classList.add('delete');
				this.click();
			}

		});

		const duration = $('p');
		duration.id = 'duration';

		span.append(thumbnail, duration);
		const metadata = $('div');
		metadata.id = 'metadata';

		const aau = $('div');
		aau.id = 'aau';

		const slot = $('slot');

		const avu = $('div');
		avu.id = 'avu';

		const avatar = $('img');
		avatar.id = 'avatar';
		avatar.loading = 'lazy';

		const author = $('p');
		author.id = 'author';
		avatar.onerror = () => avatar.src = blankImage;

		const viewsXuploaded = $('p');
		viewsXuploaded.id = 'viewsXuploaded';

		avu.append(author, viewsXuploaded);
		aau.append(avatar, avu);
		metadata.append(slot, aau);
		root.append(style, span, metadata);
	}

	connectedCallback() {

		const root = <ShadowRoot>this.shadowRoot;
		const data = <DOMStringMap>this.dataset;

		const thumbnail = <HTMLImageElement>root.getElementById('thumbnail');
		const avatar = <HTMLImageElement>root.getElementById('avatar');
		const duration = <HTMLParagraphElement>root.getElementById('duration');
		const author = <HTMLParagraphElement>root.getElementById('author');
		const viewsXuploaded = <HTMLParagraphElement>root.getElementById('viewsXuploaded');

		if (!getSaved('img')) {
			thumbnail.src = imgUrl(<string>data.id, 'mqdefault');
			data.avatar ?
				avatar.src = data.avatar :
				avatar.style.display = 'none';
		}
		else thumbnail.src = blankImage;


		if (data.duration)
			duration.textContent = data.duration

		if (data.author)
			author.textContent = data.author;

		if (data.views)
			viewsXuploaded.textContent = data.views + (data.uploaded ? ' • ' + data.uploaded.replace('Streamed ', '') : '');
	}
})
