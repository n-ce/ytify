import { getDB, saveDB, toCollection } from '@lib/utils';
import { navStore, setNavStore, setStore, t } from '@lib/stores';
import { lazy, Show } from 'solid-js';


const Login = lazy(() => import('@components/Login'));

export default function Dropdown(_: {
  setAbout: () => void,
  isLibrary: () => Boolean
}) {
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

  function toggleFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  return (
    <details>
      <summary><i class="ri-more-2-fill"></i></summary>
      <ul>
        <Show when={_.isLibrary()}>

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

          <li onclick={() => {
            setStore('dialog', Login);
            (document.querySelector('.displayer') as HTMLDialogElement).showModal();
          }}>
            <i class="ri-cloud-fill"></i>&nbsp;Cloud Sync
          </li>
        </Show>

        <Show when={!navStore.settings.state}>

          <li onclick={() => setNavStore('settings', 'state', true)}>
            <i
              class="ri-settings-line"
            ></i>&nbsp;{t('nav_settings')}
          </li>
        </Show>

        <li id="fullScreenBtn" onclick={toggleFullScreen}>
          <i class="ri-fullscreen-line"></i>&nbsp;{t('settings_fullscreen')}
        </li>

        <li onclick={_.setAbout}>
          <i class="ri-information-line"></i>&nbsp;About ytify
        </li>
      </ul>
    </details>
  )
}
