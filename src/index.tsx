/* @refresh reload */
import { render } from 'solid-js/web';
import { For, lazy, onMount, Show } from 'solid-js';
import './styles/global.css';
import { updateLang, navStore, playerStore, store } from './lib/stores';

const MiniPlayer = lazy(() => import('./components/MiniPlayer'));
const ActionsMenu = lazy(() => import('./components/ActionsMenu'));
const SnackBar = lazy(() => import('./components/SnackBar'));


function App() {

  onMount(async () => await import('./lib/modules/start.ts').then(mod => mod.default()));

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

      <Show when={!navStore.player.state && playerStore.stream.id}>
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


updateLang().then(() => {
  render(() => <App />, document.body);
});
