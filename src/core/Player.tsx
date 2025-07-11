import { JSX, onMount } from "solid-js"

export default function(_: {
  img: JSX.Element,
  track: JSX.Element,
  playBtn: JSX.Element,
  playNext: JSX.Element,
  close: () => void,
  queue: () => void
}) {
  let playerSection!: HTMLDivElement;
  onMount(() => {
    playerSection.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  })
  return (
    <section
      id="playerSection"
      ref={playerSection}>

      {_.img}

      {_.track}

      <span id="durationSlider">
        <input type="range" value="0" id="progress" />
        <div>
          <p id="currentDuration">00:00</p>
          <p id="fullDuration">00:00</p>
        </div>
      </span>

      <div id="playerPrimary">
        <button data-translation-aria-label="player_play_previous" class="ri-skip-back-line"
          id="playPrevButton"></button>
        <button data-translation-aria-label="player_seek_backward" class="ri-replay-15-line"
          id="seekBwdButton"></button>
        {_.playBtn}

        <button data-translation-aria-label="player_seek_forward" class="ri-forward-15-line"
          id="seekFwdButton"></button>
        {_.playNext}

      </div>

      <div id="playerSecondary">
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
        </select>
        <label data-translation-aria-label="player_volume" for="volumeSlider" class="ri-volume-up-fill"></label>
        <input type="range" min="0" max="100" value="100" id="volumeSlider" />

        <i data-translation-aria-label="player_loop" class="ri-repeat-line" id="loopButton"></i>
        <input type="checkbox" id="favButton" />
        <label data-translation-aria-label="player_like" for="favButton" class="ri-heart-line"></label>
        <i data-translation-aria-label="player_more" class="ri-more-2-fill" id="moreBtn"></i>
      </div>

      <div id="playerTertiary">
        <i
          class="ri-fullscreen-line"></i>
        <i
          onclick={_.close}
          class="ri-close-line"></i>
        <i
          onclick={_.queue}
          class="ri-list-check-2"></i>
      </div>
    </section>
  )
}
