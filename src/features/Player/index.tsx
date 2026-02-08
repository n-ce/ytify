import { createEffect, createSignal, lazy, onCleanup, onMount, Show } from "solid-js"
import './Player.css'
import { MediaDetails } from "@components/MediaPartials";
import { config, cssVar } from "@lib/utils";
import { closeFeature, playerStore, setNavStore, setStore, t, updateParam } from "@lib/stores";

const MediaArtwork = lazy(() => import('../../components/MediaPartials/MediaArtwork'));
const Lyrics = lazy(() => import('./Lyrics'));
const Video = lazy(() => import('./Video'));
const Controls = lazy(() => import('./Controls'));

export default function() {
  let playerSection!: HTMLDivElement;


  const [showLyrics, setShowLyrics] = createSignal(false);

  onMount(() => {
    setNavStore('player', 'ref', playerSection);
    // playerSection.scrollIntoView(); 
  });

  createEffect(() => {
    if (playerStore.stream.id)
      updateParam('s', playerStore.stream.id);
  });

  onCleanup(() => {
    updateParam('s');
  });


  createEffect(() => {
    const { immersive, mediaArtwork } = playerStore;
    if (immersive)
      cssVar('--player-bg', `url(${mediaArtwork})`);
  });


  function getContext() {
    const { id } = playerStore.context;

    return id;
  }


  /* Gesture Support */
  let touchStartY = 0;
  let touchEndY = 0;

  const handleTouchStart = (e: TouchEvent) => {
    touchStartY = e.touches[0].clientY;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndY = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (!touchStartY || !touchEndY) return;
    const distance = touchStartY - touchEndY;
    const isUpSwipe = distance > 70;
    const isDownSwipe = distance < -70;

    // Swipe Up -> Show Lyrics (if not already showing)
    if (isUpSwipe && !showLyrics()) {
        // Only if we are near bottom or if it feels right. 
        // For simplicity, let's allow it anywhere if not scrolling? 
        // Actually, preventing conflict with scroll is hard. 
        // Let's rely on button for Lyrics normally, but add Swipe Up only if not scrolling content?
        // If content is short and no scrollbar, it works.
        // If scrollable, it might conflict.
        // Report asked for it. I'll implement it.
        setShowLyrics(true);
    }

    // Swipe Down -> Close Player (if Lyrics not showing)
    if (isDownSwipe) {
        if (showLyrics()) {
            setShowLyrics(false);
        } else {
             // Only close if at top of scroll
             if (!playerSection || playerSection.scrollTop <= 0) {
                 closeFeature('player');
             }
        }
    }
    
    // Reset
    touchStartY = 0;
    touchEndY = 0;
  };


  return (
    <section
      id="playerSection"
      ref={playerSection}
      ontouchstart={handleTouchStart}
      ontouchmove={handleTouchMove}
      ontouchend={handleTouchEnd}
    >

      <Show when={playerStore.immersive} >
        <div class="bg-pane" />
        <div class="bg-image" />
      </Show>

      <header class="topShelf">
        <p>{t('player_from', getContext())}</p>

        <div class="right-group">

          <i
            aria-label={t('close')}
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

        <Show when={playerStore.isWatching && !playerStore.isMusic}>
          <Video />
        </Show>

        <Show when={showLyrics()}>
          <Lyrics onClose={() => setShowLyrics(false)} />
        </Show>

        <Show when={(!playerStore.isWatching || playerStore.isMusic) && config.loadImage && !showLyrics()}>
          <MediaArtwork />
        </Show>


        <MediaDetails />

        <Show when={!playerStore.isWatching || playerStore.isMusic}>
          <Controls showLyrics={showLyrics} setShowLyrics={setShowLyrics} />
        </Show>

      </article>
    </section>
  )
}
