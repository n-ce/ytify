import { navStore, setNavStore, setStore, store, t } from '@lib/stores';
import { lazy, Show } from 'solid-js';
import { setConfig } from '@lib/utils';

const LibraryActions = lazy(() => import('./Library/Actions'));

export default function Dropdown() {

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
          <LibraryActions />
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

        <Show when={!matchMedia('(display-mode: standalone)').matches}>
          <li id="fullScreenBtn" onclick={toggleFullScreen}>
            <i class="ri-fullscreen-line"></i>&nbsp;{t('settings_fullscreen')}
          </li>
        </Show>

        <Show when={store.homeView}>
          <li onclick={() => {
            setStore('homeView', '');
            setConfig('home', '');
          }}>
            <i class="ri-information-line"></i>&nbsp;{t('library_about_ytify')}
          </li>
        </Show>
      </ul>
    </details >
  )
}
