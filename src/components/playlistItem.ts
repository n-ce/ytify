import css from './playlistXchannelItem.css?inline';

customElements.define('playlist-item', class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = css;

    const thumbnail = document.createElement('img');
    thumbnail.id = 'thumbnail';

    const title = document.createElement('slot');

    const author = document.createElement('p');
    author.id = 'author';

    const amount = document.createElement('p');
    amount.id = 'amount';

    const div = document.createElement('div');
    div.append(title, author, amount);

    this.shadowRoot?.append(style, thumbnail, div);

  }
  connectedCallback() {
    const root = this.shadowRoot;
    const data = this.dataset;
    if (!root || !data) return;

    const thumbnail = <HTMLImageElement>root.getElementById('thumbnail');
    const amount = <HTMLParagraphElement>root.getElementById('amount');
    const author = <HTMLParagraphElement>root.getElementById('author');

    if (data.thumbnail)
      thumbnail.src = data.thumbnail;


    if (data.length !== '-1' && data.length)
      amount.textContent = data.length + ' streams';

    if (data.author)
      author.textContent = data.author;
  }
})
