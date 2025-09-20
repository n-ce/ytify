import { For, Match, Show, Switch, createSignal } from 'solid-js';
import About from './About';
import Hub from './Hub';
import './Home.css';
import { config, setConfig } from '../../lib/utils';
import { navStore, setNavStore } from '../../lib/stores';
import Collections from './Collections';
import SubLists from './SubLists';
import Dropdown from './Dropdown';


export default function() {

  const homeItems = ['ytify', 'Hub', 'Library'];
  const [home, setHome] = createSignal(config.home);


  let syncBtn!: HTMLElement;

  const { dbsync } = config;

  if (dbsync) import('../../lib/modules/cloudSync').then(mod => mod.default(dbsync, syncBtn));

  return (
    <section class="home" ref={(e) => setNavStore('home', { ref: e })}>

      <header>
        <p onclick={() => {
          const currentHomeIndex = homeItems.indexOf(home());
          const nextHomeIndex = (currentHomeIndex + 1) % homeItems.length;
          const nextHome = homeItems[nextHomeIndex];
          setHome(nextHome);
          setConfig('home', nextHome);
        }}>{home()}</p>
        <Show when={dbsync}>
          <i
            id="syncNow"
            class="ri-cloud-fill"
            ref={syncBtn}
          ></i>
        </Show>
        <div class="right-group">
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

        <Dropdown />
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
