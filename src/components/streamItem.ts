import { LitElement, html, css } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { blankImage, getSaved, imgUrl, sqrThumb } from "../lib/utils";
import { thumbnailProxies } from "../lib/dom";

@customElement('stream-item')
export class StreamItem extends LitElement {

	@query('span') span!: HTMLSpanElement
	@query('#metadata') metadata!: HTMLDivElement
	@query('#thumbnail') thumbnail!: HTMLImageElement
	@query('#avatar') avatar!: HTMLImageElement

	@property() 'data-duration'!: string
	@property() 'data-author'!: string
	@property() 'data-avatar'!: string
	@property() 'data-title'!: string
	@property() views!: string
	@property() uploaded!: string

	@state() tsrc = blankImage;
	@state() unravel = '0';
	@state() display = 'initial';

	handleThumbnailLoad() {
		if (this.thumbnail.naturalWidth !== 120) {
			this.unravel = '1';
			return;
		}
		if (this.tsrc.includes('webp'))
			this.thumbnail.src = this.tsrc.replace('.webp', '.jpg').replace('vi_webp', 'vi');
		else { // most likely been removed from yt so remove it 
			this.classList.add('delete');
			this.click();
		}
	}

	render() {
		const imgOff = getSaved('img') ? true : false;
		let avImg = '';

		if (!imgOff) {
			const img = imgUrl(<string>this.dataset.id, 'mqdefault');
			if (location.search.endsWith('songs')) {
				const x = new Image();
				x.onload = () => this.tsrc = sqrThumb(x);
				x.src = img;
				x.crossOrigin = '';
			}
			else this.tsrc = img;

			if (this["data-avatar"] && !avImg.startsWith('http'))
				avImg = thumbnailProxies.value + this["data-avatar"];
		}

		if (!avImg)
			this.display = 'none';


		return html`
				<span style=${'opacity:' + this.unravel}>
					<img 
						id='thumbnail'
						loading='lazy'
						crossorigin='anonymous'
						@error=${() => this.unravel = '1'}
						@load=${this.handleThumbnailLoad}
						src=${this.tsrc}
					/>
					<p id='duration'>${this["data-duration"]}</p>
				</span>
				<div id='metadata' style=${'opacity:' + this.unravel}>
					<p id='title'>${this["data-title"]}</p>
					<div id='aau'>
						<img 
							id='avatar'
							loading='lazy'
							src=${avImg}
							style=${'display:' + this.display}
						/>
						<div id='avu'>
							<p id='author'>${this["data-author"]}</p>
							<p id='viewsXuploaded'>${(this.views || '') + (this.uploaded ? ' • ' + this.uploaded.replace('Streamed ', '') : '')}</p>
						</div>
					</div>
				</div>
			`;

	}



	static styles = css`
	:host {
		height: 20vmin;
  	width: calc(100% - 2vmin);
  	user-select: none;
  	background-color: var(--onBg);
  	padding: 1vmin;
  	margin-bottom: 1vmin;
  	border-radius: calc(var(--roundness) + 0.75vmin);
  	display: flex;
	}
	span,#metadata {
  	opacity: 0;
  	transition: all 0.3s;
	}
	p {
  	margin: 0;
  	padding: 0;
  	font-size: smaller;
  	overflow: hidden;
	}
	span {
  	position: relative;
  	z-index: 0;
  	height: 20vmin;
  	margin-right: 1vmin;
	}
	#thumbnail {
  	height: 100%;
  	border-radius: var(--roundness);
	}
	#duration {
  	position: absolute;
  	margin: 0;
  	padding: 0.5vmin 1vmin;
  	bottom: 1.1vmin;
  	right: 1.2vmin;
  	background-color: #0007;
  	color: #fffc;
  	font-weight: bold;
  	font-size: small;
  	border-radius: 1vmin;
	}
	#title {
  	font-size: medium;
  	height: 55%;
  	width: auto;
  	display: flex;
  	overflow: hidden;
  	word-break: break-all;
  	text-overflow: clip;
	}
	div {
  	display: flex;
  	overflow: hidden;
	}
	#avatar {
  	height: 8vmin;
  	border-radius: 50%;
  	margin: 1vmin;
  	margin-left: 0;
	}
	#metadata {
  	display: flex;
  	flex-direction: column;
  	height: 100%;
  	width: 90%;
	}
	#aau {
  	display: flex;
  	align-items: center;
	}
	#avu {
  	display: flex;
  	flex-direction: column;
	}
	#author {
  	height: auto;
  	text-overflow: clip;
	}
	
	@media(orientation:landscape) {
		#avu {
    	width: 100%;
    	display: inline-flex;
    	flex-direction: row;
    	justify-content: space-between;
		}
		#author {
    	height: initial;
		}
	}
	`;
}

