/* @refresh reload */
import { render } from 'solid-js/web';
import { Show } from 'solid-js';
import './styles/index.css';
import { state } from './lib/store';
import { themer } from './lib/gfxUtils';
import Home from './core/Home';
import Player from './core/Player';
import Queue from './core/Queue';
import Settings from './core/Settings';
import Search from './core/Search';
import MiniPlayer from './core/MiniPlayer';
import List from './core/List';
import { createStore } from 'solid-js/store';

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

const [nav, setNav] = createStore({
  player: false,
  queue: false,
  list: false,
  settings: false,
  search: false
});


let homeRef!: HTMLElement;
type tails = 'player' | 'queue' | 'list' | 'settings' | 'search';

function closeSection(section: tails) {
  homeRef.scrollIntoView({
    behavior: 'smooth'
  });
  setTimeout(() => {
    setNav(section, false);
  }, 500)
}


render(() =>
  <>
    <main>
      <Home
        settings={() => setNav('settings', true)}
        search={() => setNav('search', true)}
        ref={(el) => homeRef = el}
      />
      <Show when={nav.search}>
        <Search
          close={() => { closeSection('search') }}
        />
      </Show>
      <Show when={nav.player}>
        <Player
          img={Image}
          playBtn={PlayButton}
          playNext={PlayNextButton}
          track={Track}
          close={() => { closeSection('player') }}
        />
      </Show>
      <Show when={nav.queue}>
        <Queue
          close={() => { closeSection('queue') }}
        />
      </Show>
      <Show when={nav.list}>
        <List
          close={() => { closeSection('list') }}
        />
      </Show>
      <Show when={nav.settings}>
        <Settings
          close={() => { closeSection('settings') }}
        />
      </Show>
    </main>

    <Show when={!nav.player}>
      <MiniPlayer
        img={Image}
        playBtn={PlayButton}
        playNext={PlayNextButton}
        track={Track}
        handleClick={() => setNav('player', true)}
      />
    </Show >
  </>
  , document.body);

if (state.loadImage) {
  // if (location.pathname !== '/')
  themer();
}
else {
  themer(); // one time only
}


