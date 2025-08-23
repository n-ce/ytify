import { createEffect, createSignal, lazy, onMount, Show } from "solid-js"
import './Player.css'
import { LikeButton, MediaDetails, PlayButton, PlayNextButton } from "../../components/MediaPartials";
import { config, convertSStoHHMMSS, cssVar } from "../../lib/utils";
import { closeFeature, openFeature, playerStore, setPlayerStore, store, t } from "../../lib/stores";

const MediaArtwork = lazy(() => import('../../components/MediaPartials/MediaArtwork'));

export default function() {


  let playerSection!: HTMLDivElement;
  let slider!: HTMLInputElement;
  onMount(() => {
    openFeature('player', playerSection);

    ['touchstart', 'touchmove', 'touchend'].forEach(type => {
      slider.addEventListener(type, (e) => e.stopPropagation());
    });

  });

  const auxCtrls = [
    [
      <LikeButton />,
      <i data-translation-aria-label="player_loop" class="ri-repeat-line" id="loopButton"></i>
    ],
    [
      <button data-translation-aria-label="player_play_previous" class="ri-skip-back-line"
        id="playPrevButton"></button>,
      <PlayNextButton />
    ],
    [
      <select id="playSpeed">
        <option value="0.25">0.25x</option>
        <option value="0.50">0.50x</option>
        <option value="0.75">0.75x</option>
        <option value="0.87">0.87x</option>
        <option value="1.00" selected>1.00x</option>
        <option value="1.25">1.25x</option>
        <option value="1.50">1.50x</option>
        <option value="1.75">1.75x</option>
        <option value="2.00">2.00x</option>
        <option value="2.50">2.50x</option>
        <option value="3.00">3.00x</option>
        <option value="3.50">3.50x</option>
        <option value="4.00">4.00x</option>
      </select>,
      <select id="volumeChanger">
        <option value="0">0%</option>
        <option value="0.15">15%</option>
        <option value="0.25">25%</option>
        <option value="0.33">33%</option>
        <option value="0.50">50%</option>
        <option value="0.66">66%</option>
        <option value="0.75">75%</option>
        <option value="0.85">85%</option>
        <option value="1.00" selected>100%</option>
      </select>
    ]
  ];

  const [ctrlIdx, setCtrlIdx] = createSignal(0);

  createEffect(() => {
    const { immersive, isMusic } = playerStore;
    const x = immersive && isMusic;
    if (!x) return;

    cssVar('--player-bg', `url(${playerStore.mediaArtwork})`);

    slider.max = Math.floor(playerSection.offsetHeight - playerSection.offsetWidth
    ).toString();

  });

  return (
    <section
      id="playerSection"
      ref={playerSection}>


      <Show when={playerStore.immersive && playerStore.isMusic} >
        <div class="immersive bg-image" />
      </Show>

      <span class="topShelf">

        <i
          onclick={(e) => {
            setCtrlIdx((ctrlIdx() + 1) % auxCtrls.length);
            (e.target as HTMLElement).style.transform = `rotateZ(-${120 * ctrlIdx()}deg)`;
          }}
          class="ri-loop-left-line"></i>
        <i
          onclick={() => { closeFeature('player') }}
          class="ri-close-large-line"></i>

      </span>

      <Show when={
        playerStore.immersive ?
          playerStore.isMusic :
          config.loadImage
      }><MediaArtwork />
      </Show>

      <div class="midShelf">
        <MediaDetails />
        <i
          aria-label={t('player_more')}
          class="ri-more-2-fill"
          id="moreBtn"
          onclick={() => console.log(store.stream)}
        ></i>
      </div>

      <span class="slider">
        <input
          type="range"
          value={playerStore.currentTime}
          id="progress"
          max={playerStore.fullDuration}
          ref={slider}
          oninput={() => {

            const v = parseInt(slider.value);
            cssVar('--player-bp', `-${v}px 0`);
            setPlayerStore('currentTime', v);
          }}
        />
        <div>
          <p id="currentDuration">{convertSStoHHMMSS(playerStore.currentTime)}</p>
          <p id="fullDuration">{convertSStoHHMMSS(playerStore.fullDuration)}</p>
        </div>
      </span>

      <div class="mainShelf">
        {auxCtrls[ctrlIdx()][0]}

        <button
          aria-label={t('player_seek_backward')}
          class="ri-replay-15-line"
          id="seekBwdButton"
        ></button>

        {<PlayButton />}

        <button
          aria-label={t('player_seek_forward')}
          class="ri-forward-15-line"
          id="seekFwdButton"
        ></button>

        {auxCtrls[ctrlIdx()][1]}
      </div>
    </section>
  )
}
