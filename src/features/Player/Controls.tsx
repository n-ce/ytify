import { LikeButton, PlayButton, PlayNextButton } from "@components/MediaPartials";
import { params, playerStore, playPrev, queueStore, setPlayerStore, updateParam, t } from "@lib/stores";
import { convertSStoHHMMSS, setConfig } from "@lib/utils";
import { Accessor, createSignal, onMount, Setter, Show } from "solid-js";

export default function(_: {
  showLyrics: Accessor<boolean>,
  setShowLyrics: Setter<boolean>
}) {

  const [isPointed, setPointed] = createSignal(params.has('t'));
  let slider!: HTMLInputElement;


  onMount(() => {
    ['touchstart', 'touchmove', 'touchend'].forEach(type => {
      slider.addEventListener(type, (e) => e.stopPropagation());
    });
  })

  function updatePositionState() {
    const { audio } = playerStore;
    const msn = 'mediaSession' in navigator;
    if (msn && 'setPositionState' in navigator.mediaSession)
      navigator.mediaSession.setPositionState({
        duration: audio.duration || 0,
        playbackRate: audio.playbackRate || 1,
        position: Math.floor(audio.currentTime || 0),
      });
  }

  return (
    <>
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
          <option value="0.33">0.33x</option>
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
              aria-label={t('player_save_progress')}
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
            aria-label={t('player_lyrics')}
            class="ri-music-2-line"
            classList={{
              on: _.showLyrics()
            }}
            onclick={() => _.setShowLyrics(!_.showLyrics())}
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
          value={playerStore.volume}
          onchange={e => {
            const ref = e.target;
            const vol = parseFloat(ref.value);
            playerStore.audio.volume = vol;
            setConfig('volume', (vol * 100).toString());
            setPlayerStore('volume', vol);
            ref.blur();
          }}
        >
          <option value="0">0%</option>
          <option value="0.002">0.2%</option>
          <option value="0.005">0.5%</option>
          <option value="0.01">1%</option>
          <option value="0.02">2%</option>
          <option value="0.05">5%</option>
          <option value="0.1">10%</option>
          <option value="0.15">15%</option>
          <option value="0.25">25%</option>
          <option value="0.5">50%</option>
          <option value="0.75">75%</option>
          <option value="1">100%</option>
        </select>

      </div>

    </>
  );
}
