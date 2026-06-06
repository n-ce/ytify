/* @refresh reload */

import { lazy, onMount, Show } from 'solid-js';
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

  const Search = navStore.search.component;
  const Library = navStore.library.component;
  const List = navStore.list.component;
  const Settings = navStore.settings.component;
  const Queue = navStore.queue.component;
  const Player = navStore.player.component;

  return (
    <>
      <main>
        <Show when={navStore.queue.state}>
          <Queue />
        </Show>
        <Show when={navStore.player.state}>
          <Player />
        </Show>

        <Show when={navStore.active === 'search'}><Search /></Show>
        <Show when={navStore.active === 'library'}><Library /></Show>
        <Show when={navStore.active === 'list'}><List /></Show>
        <Show when={navStore.active === 'settings'}><Settings /></Show>
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
