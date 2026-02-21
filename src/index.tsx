/* @refresh reload */

import { For, lazy, onMount, Show } from 'solid-js';
import { render } from 'solid-js/web';
import { themer, syncLibrary } from '@utils';
import NavBar from '@components/NavBar.tsx';
import { updateLang, setStore, store, navStore, playerStore } from '@stores';
import './styles/global.css';

updateLang().then(() => {
  themer();

  render(() => (
    <App />
  ), document.body);
});



const MiniPlayer = lazy(() => import('@components/MiniPlayer'));
const ActionsMenu = lazy(() => import('@components/ActionsMenu'));
const SnackBar = lazy(() => import('@components/SnackBar'));

export default function App() {

  onMount(async () => {
    await import('@modules/start.ts').then(mod => mod.default());

    setStore('syncState', 'synced');
    syncLibrary('init');
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
