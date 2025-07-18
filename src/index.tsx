/* @refresh reload */
import { render } from 'solid-js/web';
import { lazy, onMount, Show } from 'solid-js';
import './styles/index.css';
import { state, store, setStore } from './lib/store';

const Home = lazy(() => import('./core/Home'));
const List = lazy(() => import('./core/List'));
const Queue = lazy(() => import('./core/Queue'));
const Player = lazy(() => import('./core/Player'));
const Search = lazy(() => import('./core/Search'));
const Settings = lazy(() => import('./core/Settings/Index.tsx'));
const MiniPlayer = lazy(() => import('./core/MiniPlayer'));

const thumbnail =
  "https://wsrv.nl/?url=https://i.ytimg.com/vi_webp/O1PkZaFy61Y/maxresdefault.webp&w=720&h=720&fit=cover";


let imgRef!: HTMLImageElement;
const audio = new Audio();
audio.onloadeddata = () => { console.log('loafed') }



const Image = state.loadImage ? (<img
  ref={imgRef}
  src={thumbnail}
  crossorigin="anonymous"
  id="miniThumbnail"
  alt="mini player thumbnail"
  onload={() => {
    if (imgRef.naturalWidth === 120)
      imgRef.src = imgRef.src
        .replace('maxres', 'mq')
        .replace('.webp', '.jpg')
        .replace('vi_webp', 'vi')
  }}
  onerror={() => {
    if (imgRef.src.includes('max'))
      imgRef.src = imgRef.src
        .replace('maxres', 'mq')
        .replace('.webp', '.jpg')
        .replace('vi_webp', 'vi')
  }}
/>) : null;


const PlayButton = (
  <button class="ri-stop-circle-fill" id="playButton" data-translation-aria-label="player_play_button"
    data-playbackState="none"></button>
);
const PlayNextButton = (
  <button data-translation-aria-label="player_play_next" class="ri-skip-forward-line"
    id="playNextButton"></button>
);


const LikeButton = (
  <>
    <label
      aria-label="player_like"
      for="favButton"
      class="ri-heart-line"
    ></label>
    <input
      type="checkbox"
      id="favButton"
      style="display:none"
      onchange={async (e) => {
        const favBtn = e.target as HTMLInputElement;
        if (!store.stream.id) return;

        const { addToCollection, removeFromCollection } = await import('./lib/libraryUtils.ts');
        if (favBtn.checked)
          addToCollection('favorites', store.stream)
        else
          removeFromCollection('favorites', store.stream.id);

        favBtn.previousElementSibling!.classList.toggle('ri-heart-fill');
      }}
    />
  </>
);

const Track = (
  <div class="track">
    <a data-translation="player_now_playing" id="title" href="" target="_blank">Now Playing</a>
    <p data-translation="player_channel" id="author">Channel</p>
  </div>
);


let homeRef!: HTMLElement;


function App() {

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

  function closeSection(section: Views) {
    homeRef.scrollIntoView({
      behavior: 'smooth'
    });
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
            img={Image}
            playBtn={PlayButton}
            likeBtn={LikeButton}
            playNextBtn={PlayNextButton}
            track={Track}
            close={() => { closeSection('player') }}
          />
        </Show>
        <Show when={store.views.queue}>
          <Queue
            close={() => { closeSection('queue') }}
          />
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
      </main>

      <Show when={!store.views.player && store.stream.id}>
        <MiniPlayer
          img={Image}
          playBtn={PlayButton}
          xtraBtn={store.queue.list.length ? PlayNextButton : LikeButton}
          track={Track}
          handleClick={() => setStore('views', 'player', true)}
        />
      </Show >
    </>
  );
}


const nl = navigator.language.slice(0, 2);
const locale = state.language || (Locales.includes(nl) ? nl : 'en');
document.documentElement.lang = locale;

import(`./locales/${locale}.json`)
  .then(_ => {
    setStore('i18nSrc', _.default);
  })
  .then(() => render(() => <App />, document.body));


