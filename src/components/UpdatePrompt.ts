import { i18n } from '../scripts/i18n';
import './UpdatePrompt.css';
import { html, render } from 'uhtml';

export default async function(dialog: HTMLDialogElement) {

  const commitsSrc = 'https://api.github.com/repos/n-ce/ytify/commits/main';
  const commitsLink = 'https://github.com/n-ce/ytify/commits';
  const list = await fetch(commitsSrc)
    .then(res => res.json())
    .then(data => data.commit.message.split('-'))
    .then(data => data.map((text: string) => (html`<li>${text}</li>`)))
    .catch(() => html`<li>Failed to load update data from Github.</li>`);

  dialog.id = 'changelog';
  dialog.open = true;
  render(dialog, html`
    <ul>
      ${list}
      <hr />
      <li>
        <a href=${commitsLink} target="_blank">
        ${i18n('updater_changelog_full')}
        </a>
      </li>
    </ul>
    <span>
      <button id="updateBtn" autofocus>
        ${i18n('updater_update')}
      </button>
      <button id="laterBtn">${i18n('updater_later')}</button>
    </span>
    `);

}
