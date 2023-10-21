import css from './streamItem.css?inline';
import { blankImage, getSaved, imgUrl } from '../lib/utils';


customElements.define('stream-item', class extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });

		const root = <ShadowRoot>this.shadowRoot;

		const style = document.createElement('style');
		style.textContent = css;

		const span = document.createElement('span');

		const thumbnail = document.createElement('img');
		thumbnail.crossOrigin = 'anonymous';
		thumbnail.id = 'thumbnail';
		thumbnail.loading = 'lazy';
		thumbnail.addEventListener('error', () => {
			const quality = thumbnail.src.includes('hq720') ? 'hqdefault' : 'hq720';
			thumbnail.src = imgUrl(
				<string>this.dataset.id,
				quality);
		});
		thumbnail.addEventListener('load', () => {
			const backupImg = this.dataset.pipedImg;
			if (thumbnail.naturalWidth === 120 && backupImg) {
				thumbnail.src = backupImg;
				return;
			}
			['span', '#metadata'].forEach(_ => (<HTMLElement>root.querySelector(_)).style.opacity = '1');

		});


		const duration = document.createElement('p');
		duration.id = 'duration';

		span.append(thumbnail, duration);
		const metadata = document.createElement('div');
		metadata.id = 'metadata';

		const aau = document.createElement('div');
		aau.id = 'aau';

		const slot = document.createElement('slot');

		const avu = document.createElement('div');
		avu.id = 'avu';

		const avatar = document.createElement('img');
		avatar.id = 'avatar';
		avatar.loading = 'lazy';

		const author = document.createElement('p');
		author.id = 'author';
		avatar.addEventListener('error', () => {
			avatar.src = blankImage;
		});

		const viewsXuploaded = document.createElement('p');
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

		if (!getSaved('img') && data.thumbnail) {
			data.pipedImg = data.thumbnail;
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
			viewsXuploaded.textContent = data.views + (data.uploaded ? ' • ' + data.uploaded : '');
	}
})
