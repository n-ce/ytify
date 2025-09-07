import { createSignal, For, Match, Show, Switch } from 'solid-js';
import About from './About';
import Hub from './Hub';
import './Home.css';
import { config, getDB, saveDB, setConfig, toCollection } from '../../lib/utils';
import { navStore, setNavStore, setStore, t } from '../../lib/stores';
import Collections from './Collections';
import SubLists from './SubLists';


export default function() {

  const catalogue = ['about', 'hub', 'collections', 'artists', 'albums', 'channels', 'playlists'];
  const [catalogueItem, setCatalogueItem] = createSignal(config.home);


  let syncBtn!: HTMLElement;

  const { dbsync } = config;

  if (dbsync) import('../../lib/modules/cloudSync').then(mod => mod.default(dbsync, syncBtn));

  async function importLibrary(e: Event) {
    const importBtn = e.target as HTMLInputElement & { files: FileList };
    const newDB = JSON.parse(await importBtn.files[0].text());
    const oldDB = getDB();
    if (!confirm(t('library_import_prompt'))) return;
    for (const collection in newDB) for (const item in newDB[collection])
      toCollection(collection, newDB[collection][item], oldDB)
    saveDB(oldDB);
    setStore('snackbar', t('library_imported'));
  };

  function exportLibrary() {
    const link = document.createElement('a');
    link.download = 'ytify_library.json';
    link.href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(getDB(), undefined, 2))}`;
    link.click();
  };

  function cleanLibrary() {
    const count = Object.values(getDB()).reduce((acc, collection) => acc + Object.keys(collection).length, 0);
    if (confirm(t('library_clean_prompt', count.toString()))) {
      localStorage.removeItem('library');
      location.reload();
    }
  };


  return (
    <section class="home" ref={(e) => setNavStore('home', { ref: e })}>

      <header>
        <p >Home </p>
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

        <details>
          <summary><i class="ri-more-2-fill"></i></summary>
          <ul>

            <li>
              <label id="importBtn" for="upload_ytify">
                <i class="ri-import-line"></i>&nbsp;{t('library_import')}

              </label>
              <input type="file" id="upload_ytify" onchange={importLibrary} />
            </li>
            <li id="exportBtn" onclick={exportLibrary}>
              <i class="ri-export-line"></i>&nbsp;{t('library_export')}

            </li>
            <li id="cleanLibraryBtn" onclick={cleanLibrary}>
              <i class="ri-delete-bin-2-line"></i>&nbsp;{t('library_clean')}
            </li>
            <li id="importPipedBtn" onclick={async () => {
              (await import('../../lib/modules/importPipedPlaylists')).default();
            }
            }>
              <i class="ri-download-cloud-line"></i>&nbsp;{t('settings_import_from_piped')}
            </li>
            <li>
              <label id="importSongshiftBtn" for="upload_songshift">
                <i class="ri-refresh-line"></i>&nbsp;Import Playlists from SongShift
              </label>
              <input type="file" id="upload_songshift" onchange={async (e) => (await import('../../lib/modules/importSongshiftStreams')).default(e.target.files![0])} />
            </li>
          </ul>
        </details>
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
