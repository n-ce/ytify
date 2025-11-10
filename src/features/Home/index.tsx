import { Match, Show, Switch, lazy, onMount } from 'solid-js';
import './Home.css';
import { config } from '@lib/utils';
import { openFeature, store } from '@lib/stores';
import Dropdown from './Dropdown';

const About = lazy(() => import('./About'));
const Hub = lazy(() => import('./Hub'));
const Search = lazy(() => import('./Search'));
const Library = lazy(() => import('./Library'));


export default function() {

  let syncBtn!: HTMLElement;
  let homeRef!: HTMLElement;

  onMount(() => {
    openFeature('home', homeRef);
  });

  return (
    <section class="home" ref={homeRef}>

      <header>
        <p>
          {store.homeView || 'ytify'}</p>

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
              if (store.syncState === 'dirty' || store.syncState === 'error') {
                import('@lib/modules/cloudSync').then(({ runSync }) => {
                  runSync(config.dbsync);
                });
              }
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
