/* @refresh reload */
import { render } from 'solid-js/web';
import { createSignal, Show } from 'solid-js';
import MiniPlayer from './core/MiniPlayer';
import './stylesheets/index.css';
import { state } from './lib/store';
import { themer } from './lib/gfxUtils';
import Home from './core/Home';
import Player from './core/Player';
import { createStore } from 'solid-js/store';
import Queue from './core/Queue';
import Settings from './core/Settings';


const [store, setStore] = createStore({

});

const thumbnail =
  "https://wsrv.nl/?url=https://i.ytimg.com/vi_webp/O1PkZaFy61Y/maxresdefault.webp&w=720&h=720&fit=cover";

let imgRef!: HTMLImageElement;

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
  <div id="track">
    <a data-translation="player_now_playing" id="title" href="" target="_blank">Now Playing</a>
    <p data-translation="player_channel" id="author">Channel</p>
  </div>
);

const [getPlayer, setPlayer] = createSignal(false);
const [getQueue, setQueue] = createSignal(false);
const [getSettings, setSettings] = createSignal(false);

render(() =>
  <>
    <main>
      <Home settings={() => setSettings(true)} />
      <Show when={getPlayer()}>
        <Player
          img={Image}
          playBtn={PlayButton}
          playNext={PlayNextButton}
          track={Track}
          close={() => setPlayer(false)}
          queue={() => setQueue(!getQueue())}
        />
      </Show>
      <Show when={getQueue()}>
        <Queue />
      </Show>
      <Show when={getSettings()}>
        <Settings close={() => setSettings(false)} />
      </Show>
    </main>

    <Show when={!getPlayer()}>
      <MiniPlayer
        img={Image}
        playBtn={PlayButton}
        playNext={PlayNextButton}
        track={Track}
        handleClick={setPlayer}
      />
    </Show >

    <audio onloadeddata={() => {
      if (state.loadImage)
        themer();
    }}
    ></audio>
    <dialog></dialog>
  </>
  , document.body);

if (state.loadImage) {
  // if (location.pathname !== '/')
  themer();
}
else {
  themer(); // one time only
}


