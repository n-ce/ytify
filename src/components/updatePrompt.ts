import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { until } from 'lit/directives/until.js';

const fetchList = () => fetch('https://api.github.com/repos/n-ce/ytify/commits/main')
  .then(res => res.json())
  .then(data => data.commit.message.split('-'))
  .then(array => array.map((c: string) => html`<li>${c}</li>`));

const fetchChangelog = () => fetch('https://raw.githubusercontent.com/wiki/n-ce/ytify/Changelog.md')
  .then(res => res.text());

@customElement('update-prompt')
export class UpdatePrompt extends LitElement {

  static styles = css`
  :host {
    background-color: var(--onBg);
    border-radius: calc(var(--roundness) + 0.75vmin);
    color: var(--text);
    box-shadow:var(--shadow);
    border:var(--border);
    display: flex;
    flex-direction: column;
    padding:0 2vmin;
  }
  ul {
    overflow: scroll;
    margin-left: -3.2ch;
    max-height: 80dvh;
  }
  ul li:first-child {
    list-style-type:none;
    font-size: 1.5rem;
    font-weight: bolder;
    margin-bottom: 5%;
  }
  span {
    display: flex;
    justify-content:space-between;
  }
  button {
    width: 49%;
    border: var(--border);
    border-radius: var(--roundness);
    background: var(--text);
    color: var(--bg);
    font-family: inherit;
    font-size: inherit;
    padding: 1vmin 2vmin;
    margin: 2.4vmin 0;
  }
  button:hover {
    background-color: var(--bg);
    color: var(--text);
  }
  `;

  @property() handleUpdate = () => { };
  @state() changelog = '';

  handleLater() {
    const dialog = <HTMLDialogElement>this.parentElement;
    dialog.close();
    dialog.remove(); // remove from DOM
  }

  render() {
    return html`
    <ul>
      ${until(fetchList(), html`<li>Loading Update...</li>`)}
      <li @click=${async () => {
        if (!this.changelog)
          this.changelog = await fetchChangelog();
        alert(this.changelog);
      }}>Read changes from previous versions</li>
      </details>
      </li>
      </ul>
      <span>
        <button @click=${this.handleUpdate} autofocus> Update</button>
        <button @click=${this.handleLater}>Later</button>
      </span>
            `;
  }
}
