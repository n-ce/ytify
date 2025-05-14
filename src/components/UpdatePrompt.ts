import './UpdatePrompt.css';
import { i18n } from "../lib/utils";
import { html } from 'uhtml';

export default async function UpdatePrompt(handleUpdate: () => void) {

  let dialog!: HTMLDialogElement;
  const commitsSrc = 'https://api.github.com/repos/n-ce/ytify/commits/main';
  const commitsLink = 'https://github.com/n-ce/ytify/commits';

  const list = await fetch(commitsSrc)
    .then(res => res.json())
    .then(data => data.commit.message.split('-'))
    .then(data => data.map((text: string) => (html`<li>${text}</li>`)));


  const template = html`
    <dialog
      id="changelog"
      ref=${(el: HTMLDialogElement) => { dialog = el }}
      open
    >
      <ul>
        ${list}
        <hr />
        <li @click=${() => open(commitsLink)}>${i18n('updater_changelog_full')}</li>
      </ul>
      <span>
        <button @click=${handleUpdate} autofocus>${i18n('updater_update')}</button>
        <button @click=${() => {
      dialog.close();
      dialog.remove();
    }}>${i18n('updater_later')}</button>
      </span>
    </dialog>`;

  return template;

}
