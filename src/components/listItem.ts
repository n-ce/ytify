export default function listItem(
	convertSStoHHMMSS: (seconds: number) => string,
	viewsFormatter: (views: number) => string,
	unixTsFMT: (timestamp: number) => string,
	css: string
) {

	customElements.define('list-item', class extends HTMLElement {
		constructor() {
			super();
			this.attachShadow({ mode: 'open' });

			const style = document.createElement('style');
			style.textContent = css;

			const span = document.createElement('span');

			const thumbnail = document.createElement('img');
			thumbnail.id = 'thumbnail';
			thumbnail.loading = 'lazy';

			const duration = document.createElement('p');
			duration.id = 'duration';

			span.append(thumbnail, duration);

			const slot = document.createElement('slot');

			const avatar = document.createElement('img');
			avatar.id = 'avatar';
			avatar.loading = 'lazy';

			const author = document.createElement('p');
			author.id = 'author';

			const viewsXuploaded = document.createElement('p');
			viewsXuploaded.id = 'viewsXuploaded';

			this.shadowRoot?.append(style, span, slot, avatar, author, viewsXuploaded);

		}
		connectedCallback() {

			const root = this.shadowRoot;
			const data = this.dataset;

			if (!root || !data) return;

			const thumbnail = <HTMLImageElement>root.getElementById('thumbnail');
			const avatar = <HTMLImageElement>root.getElementById('avatar');
			const duration = root.getElementById('duration');
			const author = root.getElementById('author');
			const viewsXuploaded = root.getElementById('viewsXuploaded');

			if (!viewsXuploaded
				|| !thumbnail
				|| !duration
				|| !avatar
				|| !author
				|| !data.thumbnail
				|| !data.uploaded
				|| !data.duration
				|| !data.avatar
				|| !data.author
				|| !data.views) return;

			if (!localStorage.getItem('img')) {
				thumbnail.src = data.thumbnail;
				avatar.src = data.avatar;
			}
			duration.textContent = convertSStoHHMMSS(parseInt(data.duration));

			author.textContent = data.author;

			viewsXuploaded.textContent = viewsFormatter(parseInt(data.views)) + ' • ' + unixTsFMT(parseInt(data.uploaded));

		}
	})
}