import './UpdatePrompt.css';
import { i18n } from "../lib/utils";
import { html } from 'uhtml';

export default async function UpdatePrompt() {

  const commitsSrc = 'https://api.github.com/repos/n-ce/ytify/commits/main';
  const commitsLink = 'https://github.com/n-ce/ytify/commits';

  const list = await fetch(commitsSrc)
    .then(res => res.json())
    .then(data => data.commit.message.split('-'))
    .then(data => data.map((text: string) => (html`<li>${text}</li>`)))
    .catch(() => html`<li>Failed to load update data from Github.</li>`);


  return html`
    <ul>
      ${list}
      <hr />
      <li @click=${() => { open(commitsLink) }}>
        ${i18n('updater_changelog_full')}
      </li>
    </ul>
    <span>
      <button id="updateBtn" autofocus>
      ${i18n('updater_update')}
      </button>
      <button id="laterBtn">${i18n('updater_later')}</button>
    </span>`;

}
