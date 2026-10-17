import {
  LikeButton,
  PlayButton,
  PlayNextButton,
} from "@components/MediaPartials";
import {
  playerStore,
  playPrev,
  queueStore,
  setPlayerStore,
  setVolume,
  updateParam,
  t,
} from "@stores";
import { convertSStoHHMMSS, VOLUME_PRESETS } from "@utils";
import { Accessor, For, onMount, Setter, Show } from "solid-js";

export default function (_: {
  showLyrics: Accessor<boolean>;
  setShowLyrics: Setter<boolean>;
}) {
  let slider!: HTMLInputElement;

  onMount(() => {
    ["touchstart", "touchmove", "touchend"].forEach((type) => {
      slider.addEventListener(type, (e) => e.stopPropagation());
    });
  });

  function updatePositionState() {
    if ("mediaSession" in navigator)
      import("@modules/mediaSession").then((m) =>
        m.updateMediaSessionPosition(),
      );
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
          <p id="currentDuration">
            {convertSStoHHMMSS(playerStore.currentTime)}
          </p>
          <p id="fullDuration">{convertSStoHHMMSS(playerStore.fullDuration)}</p>
        </div>
      </span>

      <div class="mainShelf">
        <Show when={queueStore.history.length}>
          <button
            aria-label={t("player_play_previous")}
            class="ri-skip-back-fill"
            id="playPrevButton"
            onclick={playPrev}
          ></button>
        </Show>

        <button
          aria-label={t("player_seek_backward")}
          class="ri-replay-15-line"
          id="seekBwdButton"
          onclick={() => {
            playerStore.audio.currentTime -= 15;
          }}
        ></button>

        <PlayButton />

        <button
          aria-label={t("player_seek_forward")}
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
          onchange={(e) => {
            const ref = e.target;
            const speed = parseFloat(ref.value);
            playerStore.audio.playbackRate = speed;
            setPlayerStore("playbackRate", speed);
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

        <Show when={playerStore.isMusic}>
          <i
            aria-label={t("player_lyrics")}
            class="ri-music-2-line"
            classList={{
              on: _.showLyrics(),
            }}
            onclick={() => _.setShowLyrics(!_.showLyrics())}
          ></i>
        </Show>

        <LikeButton />

        <i
          aria-label={t("player_loop")}
          class="ri-repeat-fill"
          classList={{ on: playerStore.loop }}
          onclick={() => {
            const newLoopState = !playerStore.loop;
            playerStore.audio.loop = newLoopState;
            setPlayerStore("loop", newLoopState);
          }}
        ></i>
        <Show when={!playerStore.isMusic}>
          <i
            aria-label={t("actions_menu_watch_video")}
            class="ri-video-line"
            onclick={() => setPlayerStore("isWatching", true)}
          ></i>

          <i
            aria-label={t("player_save_progress")}
            class={`ri-signpost-${playerStore.saveProgress ? "fill" : "line"}`}
            onclick={() => {
              if (playerStore.saveProgress) {
                setPlayerStore("saveProgress", false);
                updateParam("t");
                updateParam("s");
              } else {
                setPlayerStore("saveProgress", true);
                if (playerStore.stream.id)
                  updateParam("s", playerStore.stream.id);
                updateParam("t", playerStore.currentTime.toString());
              }
            }}
          ></i>
        </Show>

        <select
          id="volumeChanger"
          value={playerStore.volume}
          onchange={(e) => {
            setVolume(parseFloat(e.target.value));
            e.target.blur();
          }}
        >
          <For each={VOLUME_PRESETS}>
            {(preset) => <option value={preset / 100}>{preset}%</option>}
          </For>
        </select>
      </div>
    </>
  );
}
