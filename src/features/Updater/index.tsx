import { createSignal, For, onMount } from 'solid-js';
import './Updater.css';
import { closeFeature, store, t } from '../../lib/stores';

export default function() {

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
    <section class="updater">
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
          onclick={store.updater}
          autofocus
        >
          {t('updater_update')}
        </button>
        <button
          id="laterBtn"
          onclick={() => {
            closeFeature('updater');
          }}
        >{t('updater_later')}</button>
      </span>
    </section>
  );

}
