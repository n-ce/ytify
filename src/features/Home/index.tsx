import { Match, Show, Switch, createSignal, lazy } from 'solid-js';
import './Home.css';
import { config, setConfig } from '@lib/utils';
import { setNavStore } from '@lib/stores';
import Dropdown from './Dropdown';
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
            class="ri-cloud-fill"
            ref={syncBtn}
          ></i>
        </Show>
        <div class="right-group">
          <Show when={home() !== 'Hub'}>
            <i
              aria-label="Hub"
              class="ri-store-2-line"
              onclick={() => saveHome('Hub')}
            ></i>
          </Show>
          <Show when={home() !== 'Library'}>
            <i
              aria-label="Library"
              class="ri-archive-stack-line"
              onclick={() => saveHome('Library')}
            ></i>
          </Show>
          <Show when={home() !== 'Search'}>
            <i
              aria-label="Search"
              class="ri-search-2-line"
              onclick={() => saveHome('Search')}
            ></i>
          </Show>

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
