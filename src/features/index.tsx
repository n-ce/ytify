/* @refresh reload */

import { For, lazy, onMount, Show } from 'solid-js';
import '../styles/global.css';
import { navStore, playerStore, setStore, store } from '@lib/stores';
import { config } from '@lib/utils';
import NavBar from '@components/NavBar.tsx';

const MiniPlayer = lazy(() => import('../components/MiniPlayer'));
const ActionsMenu = lazy(() => import('../components/ActionsMenu'));
const SnackBar = lazy(() => import('../components/SnackBar'));

export default function() {

  onMount(async () => {
    await import('../lib/modules/start.ts').then(mod => mod.default());

    setStore('syncState', 'synced'); // Initialize syncState

    // Initial sync attempt
    if (config.dbsync) {
      setStore('syncState', 'synced'); // Initialize syncState to synced
      import('@lib/modules/cloudSync').then(({ runSync }) => {
        runSync(config.dbsync);
      });
    }
  });

  return (
    <>
      <main>
        <For each={Object.values(navStore)}>
          {(item) =>
            <Show when={item.state}>
              <item.component />
            </Show>
          }
        </For>
      </main>
      <footer>
        <Show when={!navStore.player.state && playerStore.playbackState !== 'none'}>
          <MiniPlayer />
        </Show >
        <NavBar />
      </footer>
      <Show when={store.actionsMenu?.id}>
        <ActionsMenu />
      </Show>
      <Show when={store.snackbar}>
        <SnackBar />
      </Show>
    </>
  );
}
