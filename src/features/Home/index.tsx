import { createSignal, For, Match, Show, Switch } from 'solid-js';
import About from './About';
import Hub from './Hub';
import './Home.css';
import { config, setConfig } from '../../lib/utils';
import { navStore, setNavStore, t } from '../../lib/stores';
import Collections from './Collections';
import SubLists from './SubLists';
import Dropdown from './Dropdown';


export default function() {

  const catalogue = ['about', 'hub', 'collections', 'artists', 'albums', 'channels', 'playlists'];
  const [catalogueItem, setCatalogueItem] = createSignal(config.home);


  let syncBtn!: HTMLElement;

  const { dbsync } = config;

  if (dbsync) import('../../lib/modules/cloudSync').then(mod => mod.default(dbsync, syncBtn));

  return (
    <section class="home" ref={(e) => setNavStore('home', { ref: e })}>

      <header>
        <p>Home</p>
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

      <div id="catalogueSelector">
        <For each={catalogue}>
          {(item) => (
            <>
              <input
                type="radio"
                id={'r.' + item}
                name="superCollectionChips"
                onclick={() => {
                  setCatalogueItem(item);
                  setConfig('home', item);
                }}
                checked={item === catalogueItem()}
              />
              <label
                for={'r.' + item}
              >{t(('library_' + item) as 'library_hub')}</label>
            </>
          )}
        </For>

      </div>

      <div id="catalogue">

        <Switch fallback={
          <About />
        }>
          <Match when={catalogueItem() === 'hub'}>
            <Hub />
          </Match>
          <Match when={catalogueItem() === 'about'}>
            <About />
          </Match>
          <Match when={catalogueItem() === 'collections'}>
            <Collections />
          </Match>
          <For each={['albums', 'playlists', 'channels', 'artists'] as APAC[]}>
            {(item) =>
              <Match when={catalogueItem() === item}>
                <SubLists flag={item} />
              </Match>
            }
          </For>

        </Switch>
      </div>
    </section >
  )
}
