import { createSignal, For, onMount } from 'solid-js';
import './Updater.css';
import { closeFeature, setStore, store, t } from '@stores';

export default function() {

  const commitsSrc = 'https://api.github.com/repos/n-ce/ytify/commits/';
  const commitsLink = 'https://github.com/n-ce/ytify/commits';
  const branch = location.origin.includes('dev') ? 'dev' : 'main';
  const [list, setList] = createSignal([t('loading')]);
  onMount(() => {
    fetch(commitsSrc + branch)
      .then(res => res.json())
      .then(data => data.commit.message.split('\n-'))
      .then(setList);
  });

  return (
    <section class="updater">
      <ul>
        <For
          each={list()}
          fallback={t('updater_failed')}
        >
          {(item) => (<li>{item}</li>)}
        </For>
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
            setStore('updater', undefined);
            closeFeature('updater');
          }}
        >{t('updater_later')}</button>
      </span>
    </section>
  );

}
