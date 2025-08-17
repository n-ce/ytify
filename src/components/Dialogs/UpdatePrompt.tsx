import { createSignal, For, onMount } from 'solid-js';
import './UpdatePrompt.css';
import { closeDialog, t } from '../../lib/stores';

export default function(_: {
  updater: () => void
}) {

  const commitsSrc = 'https://api.github.com/repos/n-ce/ytify/commits/main';
  const commitsLink = 'https://github.com/n-ce/ytify/commits';
  const [list, setList] = createSignal(['']);
  onMount(() => {
    fetch(commitsSrc)
      .then(res => res.json())
      .then(data => data.commit.message.split('-'))
      .then(setList);
  });

  return (
    <dialog id="changelog">
      <ul>
        <For
          each={list()}
          fallback={'Failed to Load Data From Github'}
        >
          {(item) => (<li>{item}</li>)}
        </For>
        <hr />
        <li>
          <a href={commitsLink} target="_blank">
            {t('updater_changelog_full')}
          </a>
        </li>
      </ul>
      <span>
        <button
          id="updateBtn"
          onclick={_.updater}
          autofocus
        >
          {t('updater_update')}
        </button>
        <button
          id="laterBtn"
          onclick={closeDialog}
        >{t('updater_later')}</button>
      </span>
    </dialog>
  );

}
