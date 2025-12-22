import { Match, Show, Switch, lazy, onMount } from 'solid-js';
import './Home.css';
import { config } from '@lib/utils';
import { setNavStore, store, t } from '@lib/stores';
import Dropdown from './Dropdown';

const About = lazy(() => import('./About'));
const Hub = lazy(() => import('./Hub'));
const Search = lazy(() => import('./Search'));
const Library = lazy(() => import('./Library'));


export default function() {

  let syncBtn!: HTMLElement;
  let homeRef!: HTMLElement;

  onMount(() => {
    homeRef.scrollIntoView();
    setNavStore('home', 'ref', homeRef);
  });

  const map: Record<string, TranslationKeys> = {
    'Hub': 'nav_hub',
    'Library': 'nav_library',
    'Search': 'nav_search'
  };


  return (
    <section class="home" ref={homeRef}>

      <header>
        <p>
          {store.homeView ? t(map[store.homeView]) : 'ytify'}</p>

        <Show when={config.dbsync}>
          <i
            id="syncNow"
            classList={{
              'ri-cloud-fill': store.syncState === 'synced',
              'ri-loader-3-line': store.syncState === 'syncing',
              'ri-cloud-off-fill': store.syncState === 'dirty' || store.syncState === 'error',
              'error': store.syncState === 'error',
            }}
            aria-label={
              (store.syncState === 'dirty' || store.syncState === 'error') ?
                'Save to Cloud' :
                store.syncState === 'synced' ?
                  'Import from Cloud' : 'Syncing'
            }
            ref={syncBtn}
            onclick={() => {
              import('@lib/modules/cloudSync').then(({ runSync }) => {
                runSync(config.dbsync);
              });
            }}
          ></i>
        </Show>

        <Dropdown />
      </header>

      <Switch fallback={<About />}>
        <Match when={store.homeView === 'Hub'}>
          <Hub />
        </Match>
        <Match when={store.homeView === 'Library'}>
          <Library />
        </Match>
        <Match when={store.homeView === 'Search'}>
          <Search />
        </Match>

      </Switch>

    </section >
  )
}
