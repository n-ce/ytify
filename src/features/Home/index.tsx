import { Match, Show, Switch, createSignal, lazy } from 'solid-js';
import './Home.css';
import { config, setConfig } from '@lib/utils';
import { setNavStore, store } from '@lib/stores';
import Dropdown from './Dropdown';
import { runSync } from '@lib/modules/cloudSync';
const About = lazy(() => import('./About'));
const Hub = lazy(() => import('./Hub'));
const Search = lazy(() => import('./Search'));
const Library = lazy(() => import('./Library'));


export default function() {

  const [home, setHome] = createSignal(config.home);
  function saveHome(name: '' | 'Hub' | 'Library' | 'Search') {
    setHome(name);
    setConfig('home', name);
  }

  let syncBtn!: HTMLElement;

  const { dbsync } = config;

  //

  return (
    <section class="home" ref={(e) => setNavStore('home', { ref: e })}>

      <header>
        <p>
          {home() || 'ytify'}</p>
        <Show when={dbsync}>
          <i
            id="syncNow"
            classList={{
              'ri-cloud-fill': store.syncState === 'synced',
              'ri-loader-3-line': store.syncState === 'syncing',
              'ri-cloud-off-fill': store.syncState === 'dirty' || store.syncState === 'error',
              'error': store.syncState === 'error',
            }}
            ref={syncBtn}
            onclick={() => {
              if (store.syncState === 'dirty' || store.syncState === 'error') {
                runSync(dbsync);
              }
            }}
          ></i>
        </Show>
        <div class="right-group">
          <i
            aria-label="Hub"
            class="ri-store-2-line"
            classList={{ 'on': home() === 'Hub' }}
            onclick={() => saveHome('Hub')}
          ></i>
          <i
            aria-label="Library"
            class="ri-archive-stack-line"
            classList={{ 'on': home() === 'Library' }}
            onclick={() => saveHome('Library')}
          ></i>
          <i
            aria-label="Search"
            class="ri-search-2-line"
            classList={{ 'on': home() === 'Search' }}
            onclick={() => saveHome('Search')}
          ></i>

        </div>

        <Dropdown
          setAbout={() => setHome('')}
          isLibrary={() => home() === 'Library'}
        />
      </header>

      <Switch fallback={<About />}>
        <Match when={home() === 'Hub'}>
          <Hub />
        </Match>
        <Match when={home() === 'Library'}>
          <Library />
        </Match>
        <Match when={home() === 'Search'}>
          <Search />
        </Match>

      </Switch>

    </section >
  )
}
