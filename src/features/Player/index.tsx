import {
  createEffect,
  createMemo,
  createSignal,
  lazy,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import "./Player.css";
import { MediaDetails } from "@components/MediaPartials";
import {
  config,
  cssVar,
  playerBackground,
  type PlayerBackground,
} from "@utils";
import { playerStore, setNavStore, setStore, t, updateParam } from "@stores";

const MediaArtwork = lazy(
  () => import("../../components/MediaPartials/MediaArtwork"),
);
const Lyrics = lazy(() => import("./Lyrics"));
const Video = lazy(() => import("./Video"));
const Controls = lazy(() => import("./Controls"));

export default function () {
  let playerSection!: HTMLDivElement;
  const [showLyrics, setShowLyrics] = createSignal(false);

  onMount(() => {
    setNavStore("player", "ref", playerSection);
  });

  createEffect(() => {
    if (playerStore.stream.id) updateParam("s", playerStore.stream.id);
  });

  onCleanup(() => {
    updateParam("s");
  });

  // Background layers are a music-only feature, videos always stay bare.
  const background = createMemo<PlayerBackground>(() =>
    playerStore.isMusic ? playerBackground() : "none",
  );
  const showBg = () => background() !== "none";

  createEffect(() => {
    const current = background();
    // Leaves --player-bg untouched while idle so nothing is painted per track.
    if (current === "none") return;
    cssVar("--player-bg", `url(${playerStore.mediaArtwork})`);
    if (!current.endsWith("-motion")) cssVar("--player-bp", "0 0");
  });

  function getContext() {
    const { id } = playerStore.context;
    return id;
  }

  return (
    <section
      id="playerSection"
      class={`bg-${background()}`}
      ref={playerSection}
    >
      <Show when={showBg()}>
        <div class="bg-image" />
        <div class="bg-pane" />
      </Show>

      <header class="topShelf">
        <p>
          <Show when={playerStore.context.src}>
            <Show
              when={playerStore.context.src === "queue"}
              fallback={t("player_from", getContext())}
            >
              {getContext()}
            </Show>
          </Show>
        </p>

        <i
          aria-label={t("player_more")}
          class="ri-more-2-fill"
          id="moreBtn"
          onclick={() => setStore("actionsMenu", playerStore.stream)}
        ></i>
      </header>

      <article>
        <Show when={playerStore.isWatching && !playerStore.isMusic}>
          <Video />
        </Show>

        <Show when={showLyrics()}>
          <Lyrics onClose={() => setShowLyrics(false)} />
        </Show>

        <Show
          when={
            (!playerStore.isWatching || playerStore.isMusic) &&
            config.loadImage &&
            !showLyrics()
          }
        >
          <MediaArtwork />
        </Show>

        <MediaDetails />

        <Show when={!playerStore.isWatching || playerStore.isMusic}>
          <Controls showLyrics={showLyrics} setShowLyrics={setShowLyrics} />
        </Show>
      </article>
    </section>
  );
}
