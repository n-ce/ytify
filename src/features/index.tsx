/* @refresh reload */

import { For, lazy, onMount, Show } from 'solid-js';
import '../styles/global.css';
import { navStore, playerStore, store } from '../lib/stores';

const MiniPlayer = lazy(() => import('../components/MiniPlayer'));
const ActionsMenu = lazy(() => import('../components/ActionsMenu'));
const SnackBar = lazy(() => import('../components/SnackBar'));

export default function() {

  onMount(async () => await import('../lib/modules/start.ts').then(mod => mod.default()));

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

      <Show when={!navStore.player.state}>
        <MiniPlayer />
      </Show >
      <Show when={store.actionsMenu.id}>
        <ActionsMenu />
      </Show>
      <Show when={store.snackbar}>
        <SnackBar />
      </Show>

    </>
  );
}
