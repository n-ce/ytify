import { For, Match, Show, Switch, createSignal, lazy } from 'solid-js';
const About = lazy(() => import('./About'));
import Hub from './Hub';
import './Home.css';
import { config, setConfig } from '../../lib/utils';
import { navStore, setNavStore } from '../../lib/stores';
import Collections from './Collections';
import SubLists from './SubLists';
import Dropdown from './Dropdown';


export default function() {

  const [home, setHome] = createSignal(config.home);
  function saveHome(name: 'ytify' | 'Hub' | 'Library') {
    setHome(name);
    setConfig('home', name);
  }


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
          <Show when={!navStore.search.state}>
            <i
              class="ri-search-2-line"
              onclick={() => setNavStore('search', 'state', true)}
            ></i>
          </Show>

          <Show when={!navStore.settings.state}>
            <i
              class="ri-settings-line"
              onclick={() => setNavStore('settings', 'state', true)}
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

        </Switch>
      </div>
    </section >
  )
}
