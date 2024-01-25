import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { until } from 'lit/directives/until.js';


@customElement('update-prompt')
export class UpdatePrompt extends LitElement {

  static styles = css`
  :host {
    background-color: var(--onBg);
    border-radius: calc(var(--roundness) + 0.75vmin);
    color: var(--text);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  ul {
    overflow: scroll;
    margin-left:-1.5rem
  }
  ul li:first-child {
    list-style-type: none;
    font-size: 1.5rem;
    font-weight: bolder;
    margin-bottom:5%;
  }
  span{
    display: flex;
  }
  button{
    width: 50%;
    border: var(--border);
    border-radius: var(--roundness);
    background: var(--text);
    color: var(--bg);
    font-family: inherit;
    font-size: inherit;
    padding: 1vmin 2vmin;
    margin: 2.4vmin 2vmin;
  }
  `;


  render() {
    return html`
    <ul>
      ${until(
      fetch('https://api.github.com/repos/n-ce/ytify/commits/main')
        .then(r => r.json())
        .then(d => d.commit.message.split('-'))
        .then(d => d.map((c: string) => html`<li>${c}</li>`)
        )
      , html`<h1>Loading Update...</h1>`)}
    </ul>
    <span>
      <button @click=${() => window.updateSW()} autofocus>Update</button>
      <button @click=${() => (<HTMLDialogElement>this.parentElement).close()}>Later</button>
    </span>
      `;
  }
}
