import { createEffect, createSignal, lazy, onMount, Show } from "solid-js"
import './Player.css'
import { LikeButton, MediaDetails, PlayButton, PlayNextButton } from "@components/MediaPartials";
import { config, convertSStoHHMMSS, cssVar } from "@lib/utils";
import { closeFeature, navStore, openFeature, params, playerStore, playPrev, queueStore, setNavStore, setPlayerStore, setStore, t, updateParam } from "@lib/stores";

const MediaArtwork = lazy(() => import('../../components/MediaPartials/MediaArtwork'));
const Lyrics = lazy(() => import('./Lyrics'));

export default function() {
  let playerSection!: HTMLDivElement;
  let slider!: HTMLInputElement;

  const [showLyrics, setShowLyrics] = createSignal(false);
  const [isPointed, setPointed] = createSignal(params.has('t'));

  onMount(() => {
    openFeature('player', playerSection);

    ['touchstart', 'touchmove', 'touchend'].forEach(type => {
      slider.addEventListener(type, (e) => e.stopPropagation());
    });


  });

  createEffect(() => {
    const { immersive, mediaArtwork } = playerStore;
    if (immersive)
      cssVar('--player-bg', `url(${mediaArtwork})`);
  });


  const msn = 'mediaSession' in navigator;

  function updatePositionState() {
    const { audio } = playerStore;
    if (msn && 'setPositionState' in navigator.mediaSession)
      navigator.mediaSession.setPositionState({
        duration: audio.duration || 0,
        playbackRate: audio.playbackRate || 1,
        position: Math.floor(audio.currentTime || 0),
      });
  }


  function getContext() {
    const { id, src } = playerStore.context;

    if (src === 'collection')
      return id;
    else
      return src[0].toUpperCase() + src.slice(1);

  }


  return (
    <section
      id="playerSection"
      ref={playerSection}>

      <Show when={playerStore.immersive} >
        <div class="bg-pane" />
        <div class="bg-image" />
      </Show>

      <header class="topShelf">
        <p>from {getContext()}</p>

        <div class="right-group">
          <i
            onclick={() => {
              setNavStore('queue', 'state', !navStore.queue.state);
            }}
            class="ri-order-play-fill"
            classList={{ on: navStore.queue.state }}
          ></i>

          <i
            onclick={() => { closeFeature('player') }}
            class="ri-close-large-line"></i>

        </div>
        <i
          aria-label={t('player_more')}
          class="ri-more-2-fill"
          id="moreBtn"
          onclick={() => setStore('actionsMenu', playerStore.stream)}
        ></i>
      </header>
      <article>

        <Show when={showLyrics()}>
          <Lyrics onClose={() => setShowLyrics(false)} />
        </Show>

        <Show when={config.loadImage && !showLyrics()}>
          <MediaArtwork />
        </Show>


        <MediaDetails />

        <span class="slider">
          <input
            type="range"
            value={playerStore.currentTime}
            max={playerStore.fullDuration}
            ref={slider}
            onchange={(e) => {
              playerStore.audio.currentTime = parseInt(e.target.value);
            }}
          />
          <div>
            <p id="currentDuration">{convertSStoHHMMSS(playerStore.currentTime)}</p>
            <p id="fullDuration">{convertSStoHHMMSS(playerStore.fullDuration)}</p>
          </div>
        </span>

        <div class="mainShelf">

          <Show when={playerStore.history.length}>
            <button
              aria-label={t('player_play_previous')}
              class="ri-skip-back-line"
              id="playPrevButton"
              onclick={playPrev}
            ></button>
          </Show>

          <button
            aria-label={t('player_seek_backward')}
            class="ri-replay-15-line"
            id="seekBwdButton"
            onclick={() => {
              playerStore.audio.currentTime -= 15;
            }}
          ></button>

          <PlayButton />

          <button
            aria-label={t('player_seek_forward')}
            class="ri-forward-15-line"
            id="seekFwdButton"
            onclick={() => {
              playerStore.audio.currentTime += 15;
            }}
          ></button>
          <Show when={queueStore.list.length}>
            <PlayNextButton />
          </Show>

        </div>

        <div class="bottomShelf">

          <select
            id="playSpeed"
            value={playerStore.playbackRate.toFixed(2)}
            onchange={e => {
              const ref = e.target;
              const speed = parseFloat(ref.value);
              playerStore.audio.playbackRate = speed;
              setPlayerStore('playbackRate', speed);
              updatePositionState();
              ref.blur();
            }}
          >
            <option value="0.25">0.25x</option>
            <option value="0.50">0.50x</option>
            <option value="0.75">0.75x</option>
            <option value="0.87">0.87x</option>
            <option value="1.00">1.00x</option>
            <option value="1.25">1.25x</option>
            <option value="1.50">1.50x</option>
            <option value="1.75">1.75x</option>
            <option value="2.00">2.00x</option>
            <option value="2.50">2.50x</option>
            <option value="3.00">3.00x</option>
            <option value="3.50">3.50x</option>
            <option value="4.00">4.00x</option>
          </select>

          <Show
            when={playerStore.isMusic}
            fallback={
              <i
                class="ri-signpost-line"
                classList={{
                  on: isPointed()
                }}
                onclick={() => {
                  if (isPointed()) {
                    updateParam('t');
                    setPointed(false);
                  }
                  else {
                    updateParam('t', playerStore.currentTime.toString());
                    setPointed(true);
                  }
                }}
              ></i>
            }
          >
            <i
              class="ri-music-2-line"
              classList={{
                on: showLyrics()
              }}
              onclick={() => setShowLyrics(!showLyrics())}
            ></i>
          </Show>


          <LikeButton />

          <i
            aria-label={t("player_loop")}
            class="ri-repeat-line"
            classList={{ on: playerStore.loop }}
            onclick={() => {
              const newLoopState = !playerStore.loop;
              playerStore.audio.loop = newLoopState;
              setPlayerStore('loop', newLoopState);
            }}
          ></i>

          <select
            id="volumeChanger"
            value={playerStore.volume.toFixed(2)}
            onchange={e => {
              const ref = e.target;
              const vol = parseFloat(ref.value);
              playerStore.audio.volume = vol;
              setPlayerStore('volume', vol);
              ref.blur();
            }}
          >
            <option value="0">0%</option>
            <option value="0.15">15%</option>
            <option value="0.25">25%</option>
            <option value="0.33">33%</option>
            <option value="0.50">50%</option>
            <option value="0.66">66%</option>
            <option value="0.75">75%</option>
            <option value="0.85">85%</option>
            <option value="1.00">100%</option>
          </select>

        </div>

      </article>
    </section>
  )
}
