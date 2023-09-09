const listItemCSS = `
:host {
  height: 20vmin;
	width: auto;
  user-select: none;
	overflow: hidden;
	background-color: var(--onBg);
	padding: 1vmin;
	margin-bottom: 1vmin;
	border-radius: calc(var(--roundedness) + 0.75vmin);
	display:grid;
	grid-template-areas:
		 "A B B"
		 "A B B"
     "A C D"
     "A C E";
	align-items:left;
justify-content:grid-start;
}
p {
	margin:0;
	padding:0
}

span {
	position:relative;
	grid-area:A;
}

#thumbnail {
	height:20vmin;
  border-radius: var(--roundedness);
	margin-right:1vmin;
}

#duration {
	position:absolute;
	margin:0;
	padding: 0.5vmin 1vmin;
	bottom: 0;
	right: calc(100% - 20vmin);
	background-color:#0007;
	color:#fffa;
	font-weight:bold;
	font-size:small;
	border-radius:1vmin;
}

slot {
display:block;
  font-weight: bold;
	grid-area: B;
	font-size: medium;
	overflow:hidden;
	max-height:9vmin;
}


#avatar {
	border-radius:50%;
	height:8vmin;
	grid-area: C;
}

#author {
	display:block;
  font-size: small;
	height:4vmin;
  overflow: hidden;
	grid-area: D;
}

#viewsXuploaded {
	display:inline;
	font-size: small;
	grid-area: E;
}
@media(orientation:landscape){
	:host{
	grid-template-areas:
"A B B B"
"A B B B"
"A B B B"
"A C D E"
}
}
`;

function convertSStoHHMMSS(seconds: number): string {
	const hh = Math.floor(seconds / 3600);
	seconds %= 3600;
	let mm = Math.floor(seconds / 60);
	let ss = Math.floor(seconds % 60);
	let mmStr = String(mm);
	let ssStr = String(ss);
	if (mm < 10) mmStr = '0' + mmStr;
	if (ss < 10) ssStr = '0' + ssStr;
	return hh > 0 ?
		`${hh}:${mmStr}:${ssStr}` :
		`${mmStr}:${ssStr}`;
}

const viewsFormatter = (views: number): string => Intl.NumberFormat('en', { notation: 'compact' }).format(views) + ' views';

function unixTsFMT(timestamp: number): string {
	const seconds = (+new Date() - +new Date(timestamp)) / 1000;

	const string =
		seconds < 3600 ?
			`${Math.floor(seconds / 60)} minute` :
			seconds < 86400 ?
				`${Math.floor(seconds / 3600)} hour` :
				seconds < 604800 ?
					`${Math.floor(seconds / 86400)} day` :
					seconds < 2628000 ?
						`${Math.floor(seconds / 604800)} week` :
						seconds < 31536000 ?
							`${Math.floor(seconds / 2628000)} month` :
							`${Math.floor(seconds / 31536000)} year`;

	return `${string}${string.startsWith('1 ') ? ' ' : 's'} ago`;
}


customElements.define('list-item', class extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });

		const style = document.createElement('style');
		style.textContent = listItemCSS;

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
