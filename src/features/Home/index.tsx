import { For, Match, Show, Switch, createSignal, lazy, onMount } from 'solid-js';
const About = lazy(() => import('./About'));
import Hub from './Hub';
import './Home.css';
import { config, setConfig } from '../../lib/utils';
import { setNavStore, params } from '../../lib/stores'; // Import params
import Collections from './Collections';
import SubLists from './SubLists';
import Dropdown from './Dropdown';
import Search from './Search'; // Import the Search component

export default function() {

  const [home, setHome] = createSignal(config.home);
  function saveHome(name: 'ytify' | 'Hub' | 'Library' | 'Search') { // Add 'Search'
    setHome(name);
    setConfig('home', name);
  }

  onMount(() => {
    const q = params.get('q');
    if (q) {
      saveHome('Search');
    }
  });


  let syncBtn!: HTMLElement;

  const { dbsync } = config;

  if (dbsync) import('../../lib/modules/cloudSync').then(mod => mod.default(dbsync, syncBtn));

  return (
    <section class="home" ref={(e) => setNavStore('home', { ref: e })}>

      <header>
        <p>{home()}</p>
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
              class="ri-store-2-line"
              onclick={() => saveHome('Hub')}
            ></i>
          </Show>
          <Show when={home() !== 'Library'}>
            <i
              class="ri-archive-stack-line"
              onclick={() => saveHome('Library')}
            ></i>
          </Show>
          <Show when={home() !== 'Search'}> {/* Change condition */}
            <i
              class="ri-search-2-line"
              onclick={() => saveHome('Search')} // Change onclick
            ></i>
          </Show>

        </div>

        <Dropdown setAbout={() => setHome('ytify')} />
      </header>


      <div id="catalogue">

        <Switch fallback={<About />}>
          <Match when={home() === 'Hub'}>
            <Hub />
          </Match>
          <Match when={home() === 'ytify'}>
            <About />
          </Match>
          <Match when={home() === 'Library'}>
            <Collections />
            <br />
            <br />
            <For each={['albums', 'playlists', 'channels', 'artists'] as APAC[]}>
              {(item) =>
                <SubLists flag={item} />
              }
            </For>

          </Match>
          <Match when={home() === 'Search'}> {/* Add new Match case */}
            <Search />
          </Match>

        </Switch>
      </div>
    </section >
  )
}