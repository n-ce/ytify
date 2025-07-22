/* @refresh reload */
import { render } from 'solid-js/web';
import { createSignal, lazy, onMount, Show } from 'solid-js';
import './styles/index.css';
import { state, store, setStore } from './lib/store';

const Home = lazy(() => import('./sections/Home'));
const List = lazy(() => import('./sections/List'));
const Queue = lazy(() => import('./sections/Queue'));
const Player = lazy(() => import('./sections/Player'));
const Search = lazy(() => import('./sections/Search/Index'));
const Settings = lazy(() => import('./sections/Settings/Index'));
const MiniPlayer = lazy(() => import('./components/MiniPlayer'));
const Watcher = lazy(() => import('./sections/WatchVideo'));
const Lyrics = lazy(() => import('./sections/Lyrics'));
const Updater = lazy(() => import('./sections/UpdatePrompt'));


const PlayNextButton = (
  <button
    aria-label="player_play_next"
    class="ri-skip-forward-line"
    id="playNextButton"
  ></button>
);

function App() {


  const audio = new Audio();
  audio.onloadeddata = () => { console.log('loafed') }

  onMount(async () => {

    const { customInstance } = state;

    if (customInstance) {

      const [pi, iv, useInvidious] = customInstance.split(',');
      setStore('player', 'hls', 'api', 0, pi);
      setStore('api', 'piped', 0, pi);
      setStore('api', 'invidious', 0, iv);
      state.enforcePiped = !useInvidious;

    } else await fetch('https://raw.githubusercontent.com/n-ce/Uma/main/dynamic_instances.json')
      .then(res => res.json())
      .then(data => {
        setStore('api', {
          piped: data.piped,
          invidious: data.invidious,
          hyperpipe: data.hyperpipe,
          jiosaavn: data.jiosaavn
        });
        setStore('player', 'hls', 'api', data.hls);
        setStore('player', 'fallback', location.origin);
        state.enforcePiped = state.enforcePiped || data.status === 1;
      });


    import('./lib/visualUtils')
      .then(mod => {
        if (state.loadImage) {
          mod.themer();
        }
        else {
          mod.themer(); // one time only     
        }
      });

  });

  let homeRef!: HTMLElement;

  function closeSection(section: Views | undefined = undefined) {
    homeRef.scrollIntoView({
      behavior: 'smooth'
    });
    if (section)
      setTimeout(() => {
        setStore('views', section, false);
      }, 500)
  }


  return (
    <>
      <main>
        <Home
          settings={() => setStore('views', 'settings', true)}
          search={() => setStore('views', 'search', true)}
          ref={(el) => homeRef = el}
        />

        <Show when={store.views.search}>
          <Search
            close={() => { closeSection('search') }}
          />
        </Show>
        <Show when={store.views.player}>
          <Player
            playNextBtn={PlayNextButton}
            close={() => { closeSection('player') }}
          />
        </Show>
        <Show when={store.queuelist.length}>
          <Queue close={() => closeSection()} />
        </Show>
        <Show when={store.views.list}>
          <List
            close={() => { closeSection('list') }}
          />
        </Show>
        <Show when={store.views.settings}>
          <Settings
            close={() => { closeSection('settings') }}
          />
        </Show>
        <Show when={update()}>
          <Updater
            updater={handleUpdate}
            close={() => setUpdate(false)}
          />
        </Show>
        <Show when={store.views.lyrics}>
          <Lyrics close={() => { closeSection('lyrics') }} />
        </Show>
        <Show when={store.views.watch}>
          <Watcher close={() => { closeSection('watch') }} />
        </Show>
      </main>

      <Show when={!store.views.player && store.stream.id}>
        <MiniPlayer
          playNextBtn={PlayNextButton}
          handleClick={() => setStore('views', 'player', true)}
        />
      </Show >
    </>
  );
}

/////// UPDATER ///////

const [update, setUpdate] = createSignal(false);

let handleUpdate: () => void;

if (import.meta.env.PROD)
  await import('virtual:pwa-register').then(pwa => {

    handleUpdate = pwa.registerSW({
      onNeedRefresh() {
        setUpdate(true);
      }
    });
  });

////////////////////////
//////// I18N //////////

const nl = navigator.language.slice(0, 2);
const locale = state.language || (Locales.includes(nl) ? nl : 'en');
document.documentElement.lang = locale;

import(`./locales/${locale}.json`)
  .then(_ => {
    setStore('i18nSrc', _.default);
  })
  .then(() => render(() => <App />, document.body));

