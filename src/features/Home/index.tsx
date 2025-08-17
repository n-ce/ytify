import { createSignal, Match, Show, Switch } from 'solid-js';
import About from './About';
import Hub from './Hub';
import './Home.css';
import { config, getDB, saveDB, toCollection } from '../../lib/utils';
import { openDialog, setNavStore, setStore, store, t } from '../../lib/stores';

export default function() {

  const [item, setItem] = createSignal('about');
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
    openDialog('snackbar', t('library_imported'));
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
    <section ref={(e) => setNavStore('features', [e])}>

      <header>
        <p>Home </p>
        <Show when={dbsync}>
          <i
            id="syncNow"
            class="ri-cloud-fill"
            ref={syncBtn}
          ></i>
        </Show>
        <Show when={!store.features.search}>
          <i
            id="searchToggle"
            class="ri-search-2-line"
            onclick={() => setStore('features', 'search', true)}
          ></i>
        </Show>
        <details>
          <summary><i class="ri-more-2-fill"></i></summary>
          <ul>
            <li
              id="settingsHandler"
              onclick={() => setStore('features', 'settings', true)}
            >
              <i class="ri-settings-line"></i>&nbsp;{t('nav_settings')}
            </li>

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
                <i class="ri-refresh-line"></i>&nbsp;Import Playlists From SongShift
              </label>
              <input type="file" id="upload_songshift" onchange={async (e) => (await import('../../lib/modules/importSongshiftStreams')).default(e.target.files![0])} />
            </li>
          </ul>
        </details>
      </header>


      <div id="catalogueSelector"

        onclick={e => {
          const input = e.target as HTMLInputElement;
          if (input.matches('input'))
            setItem(input.value);

        }}
      >
        <input type="radio" id="r.about" name="superCollectionChips" checked value="about" />
        <label for="r.about">About</label>
        <input type="radio" id="r.hub" name="superCollectionChips" value="hub" />
        <label for="r.hub">Hub</label>
        <input type="radio" id="r.collections" name="superCollectionChips" value="collections" />
        <label data-translation="library_collections" for="r.collections">Collections</label>
        <input type="radio" id="r.playlists" name="superCollectionChips" value="playlists" />
        <label data-translation="library_playlists" for="r.playlists">Playlists</label>
        <input type="radio" id="r.albums" name="superCollectionChips" value="albums" />
        <label data-translation="library_albums" for="r.albums">Albums</label>
        <input type="radio" id="r.artists" name="superCollectionChips" value="artists" />
        <label data-translation="library_artists" for="r.artists">Artists</label>
        <input type="radio" id="r.channels" name="superCollectionChips" value="channels" />
        <label data-translation="library_channels" for="r.channels">Channels</label>

      </div>


      <div id="catalogue">

        <Switch>
          <Match when={item() === 'hub'}>
            <Hub />
          </Match>
          <Match when={item() === 'about'}>
            <About />
          </Match>

        </Switch>
      </div>
    </section >
  )
}
