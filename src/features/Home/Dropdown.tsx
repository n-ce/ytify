import { getTracksMap } from '@lib/utils/library';
import { navStore, setNavStore, setStore, store, t } from '@lib/stores';
import { lazy, Show } from 'solid-js';
import { render } from 'solid-js/web';
import { setConfig } from '@lib/utils';


const Login = lazy(() => import('@components/Login'));

export default function Dropdown() {
  async function importLibrary(e: Event) {
    const importBtn = e.target as HTMLInputElement & { files: FileList };
    const importedData = JSON.parse(await importBtn.files[0].text());

    if (importedData.meta) { // Check for V2 library
      // Deconsolidate V2 library
      for (const key in importedData) {
        if (importedData.hasOwnProperty(key)) {
          localStorage.setItem('library_' + key, JSON.stringify(importedData[key]));
        }
      }
      setStore('snackbar', t('library_imported')); // Reusing existing translation key
      location.reload();
    } else { // Assume V1 library
      localStorage.setItem('library', JSON.stringify(importedData));
      setStore('snackbar', 'Migrating Library v1 to v2...'); // New translation key needed
      location.reload(); // Trigger migration
    }
  };

  function exportLibrary() {
    const link = document.createElement('a');
    link.download = 'ytify_library.json';

    const exportedData: { [key: string]: any } = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('library_')) {
        exportedData[key.slice(8)] = JSON.parse(localStorage.getItem(key)!);
      }
    }

    link.href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportedData, undefined, 2))}`;
    link.click();
  };

  function cleanLibrary() {
    // Count items in V2 library
    let count = 0;
    const tracksMap = getTracksMap();
    count = Object.keys(tracksMap).length;

    if (confirm(t('library_clean_prompt', count.toString()))) {
      // Get all keys to remove
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('library')) {
          keysToRemove.push(key);
        }
      }

      // Remove all V2 library_ keys
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }

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
      <summary><i
        aria-label="More Options"
        class="ri-more-2-fill"
      ></i></summary>
      <ul>
        <Show when={store.homeView === 'Library'}>

          <li onclick={() => document.getElementById('upload_ytify')?.click()}>
            <label>
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
          <li onclick={() => document.getElementById('upload_songshift')?.click()}>
            <label>
              <i class="ri-refresh-line"></i>&nbsp;Import Playlists from SongShift
            </label>
            <input type="file" id="upload_songshift" onchange={async (e) => (await import('../../lib/modules/importSongshiftStreams')).default(e.target.files![0])} />
          </li>

          <li onclick={() => {
            render(() => <Login />, document.body);
          }}>
            <i class="ri-cloud-fill"></i>&nbsp;Cloud Sync
          </li>
        </Show>

        <Show when={store.homeView === 'Hub'}>
          <li onclick={() => {
            if (confirm(t('clear_hub_prompt'))) {
              localStorage.removeItem('hub');
              location.reload();
            }
          }}>
            <i class="ri-delete-bin-2-line"></i>&nbsp;{t('clear_hub')}
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

        <li onclick={() => {
          setStore('homeView', '');
          setConfig('home', '');
        }}>
          <i class="ri-information-line"></i>&nbsp;About ytify
        </li>
      </ul>
    </details >
  )
}
