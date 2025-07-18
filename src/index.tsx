/* @refresh reload */
import { render } from 'solid-js/web';
import { onMount, Show } from 'solid-js';
import './styles/index.css';
import { state, store, setStore, i18nize } from './lib/store';
import Home from './core/Home';
import Player from './core/Player';
import Queue from './core/Queue';
import Settings from './core/Settings';
import Search from './core/Search';
import MiniPlayer from './core/MiniPlayer';
import List from './core/List';
import { themer } from './lib/visualUtils';

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

const Track = (
  <div class="track">
    <a data-translation="player_now_playing" id="title" href="" target="_blank">Now Playing</a>
    <p data-translation="player_channel" id="author">Channel</p>
  </div>
);

let homeRef!: HTMLElement;

function closeSection(section: Views) {
  homeRef.scrollIntoView({
    behavior: 'smooth'
  });
  setTimeout(() => {
    setStore('views', section, false);
  }, 500)
}

function App() {

  onMount(() => {

    if (state.loadImage) {
      themer();
    }
    else {
      themer(); // one time only
    }
  });
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
            playNext={PlayNextButton}
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

      <Show when={!store.views.player}>
        <MiniPlayer
          img={Image}
          playBtn={PlayButton}
          playNext={PlayNextButton}
          track={Track}
          handleClick={() => setStore('views', 'player', true)}
        />
      </Show >
    </>
  );
}

i18nize().then(() => render(() => <App />, document.body));


