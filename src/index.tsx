/* @refresh reload */
import { render } from 'solid-js/web';
import { lazy, onMount, Show } from 'solid-js';
import './styles/global.css';
import { themer } from './lib/utils';
import { setStore, store, dialogState, openDialog, updateLang, initNetwork, navStore, setNavStore } from './lib/stores';

const Home = lazy(() => import('./features/Home'));
const List = lazy(() => import('./features/List'));
const Queue = lazy(() => import('./features/Queue'));
const Player = lazy(() => import('./features/Player'));
const Search = lazy(() => import('./features/Search'));
const Settings = lazy(() => import('./features/Settings'));
const MiniPlayer = lazy(() => import('./components/MiniPlayer'));
const Watcher = lazy(() => import('./features/Video'));
const Lyrics = lazy(() => import('./features/Lyrics'));

const UpdatePrompt = lazy(() => import('./components/Dialogs/UpdatePrompt'));
const Snackbar = lazy(() => import('./components/Dialogs/Snackbar.tsx'));
const ActionsMenu = lazy(() => import('./components/Dialogs/ActionsMenu'));


function App() {


  onMount(async () => {
    themer();

    await initNetwork();
  });


  function closeFeature(section: Features | undefined = undefined) {
    setNavStore('features', features => features.slice(0, -1));

    navStore.features[navStore.features.length - 1].scrollIntoView({
      behavior: 'smooth'
    });
    if (section)
      setTimeout(() => {
        setStore('features', section, false);
      }, 500)
  }

  return (
    <>
      <main>
        <Home />

        <Show when={store.features.search}>
          <Search
            close={() => { closeFeature('search') }}
          />
        </Show>
        <Show when={store.features.player}>
          <Player
            close={() => { closeFeature('player') }}
          />
        </Show>
        <Show when={store.queuelist.length}>
          <Queue close={() => closeFeature()} />
        </Show>
        <Show when={store.features.list}>
          <List
            close={() => { closeFeature('list') }}
          />
        </Show>
        <Show when={store.features.settings}>
          <Settings
            close={() => { closeFeature('settings') }}
          />
        </Show>
        <Show when={store.features.lyrics}>
          <Lyrics close={() => { closeFeature('lyrics') }} />
        </Show>
        <Show when={store.features.video}>
          <Watcher close={() => { closeFeature('video') }} />
        </Show>
      </main>

      <Show when={!store.features.player && store.stream.id}>
        <MiniPlayer
          handleClick={() => setStore('features', 'player', true)}
        />
      </Show >


      {
        dialogState.activeDialog === 'actionsMenu' ?

          <ActionsMenu data={dialogState.data} /> :
          dialogState.activeDialog === 'snackbar' ?
            <Snackbar text={dialogState.data} /> :

            dialogState.activeDialog === 'updatePrompt' ?

              <UpdatePrompt updater={dialogState.data} /> : null
      }
    </>
  );
}




if (import.meta.env.PROD)
  await import('virtual:pwa-register').then(pwa => {

    const handleUpdate = pwa.registerSW({
      onNeedRefresh() {
        openDialog('updatePrompt', handleUpdate);
      }
    });
  });



updateLang().then(() => {
  render(() => <App />, document.body);
});
