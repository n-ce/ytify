/* @refresh reload */
import { render } from 'solid-js/web';
import { createEffect, For, lazy, onMount, Show } from 'solid-js';
import './styles/global.css';
import { binary2hex, hex2binary, setConfig, themer } from './lib/utils';
import { dialogState, openDialog, updateLang, initNetwork, navStore, playerStore, params, setNavStore, setSearchStore, getSearchResults } from './lib/stores';

const MiniPlayer = lazy(() => import('./components/MiniPlayer'));
const UpdatePrompt = lazy(() => import('./components/Dialogs/UpdatePrompt'));
const Snackbar = lazy(() => import('./components/Dialogs/Snackbar.tsx'));
const ActionsMenu = lazy(() => import('./components/Dialogs/ActionsMenu'));


function App() {

  onMount(async () => {

    const f = Object.keys(navStore.features);
    const p = params.get('p');
    if (p && p !== '10') {
      const binary = hex2binary(p).split('');
      f.forEach((v, i) => {
        if (binary[i] === '1')
          setNavStore('features', v as Features, { state: true })
      })
    }
    themer();
    await initNetwork();


    const q = params.get('q');

    if (q) {
      if (!navStore.features.search.state)
        setNavStore('features', 'search', 'state', true);
      setConfig('searchFilter', params.get('f') || 'all');

      setSearchStore('query', q);
      getSearchResults();
    }
  });

  createEffect(() => {
    const p = navStore.params;

    for (const navParam in p) {
      const navParamVal = p[navParam as keyof typeof p];

      if (!navParamVal) params.delete(navParam);
      else if (navParam === 'p') {
        if (navParamVal === '00010000') params.delete(navParam);
        else params.set('p', binary2hex(navParamVal))
      }
      else if (navParam === 'f') {
        if (!p.q || navParamVal === 'all') params.delete(navParam);
        else params.set('f', navParamVal)
      }
      else params.set(navParam, navParamVal);
    }

    if (params.toString())
      history.replaceState({}, '', location.origin + '?' + params.toString());

  })


  return (
    <>
      <main>
        <For each={Object.values(navStore.features)}>
          {(item) =>
            <Show when={item.state}>
              <item.component />
            </Show>
          }
        </For>
      </main>

      <Show when={!navStore.features.player.state && playerStore.id}>
        <MiniPlayer />
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
