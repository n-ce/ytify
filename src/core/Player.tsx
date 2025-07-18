import { createSignal, JSX, onMount } from "solid-js"
import './player.css'


export default function(_: {
  img: JSX.Element,
  track: JSX.Element,
  likeBtn: JSX.Element,
  playBtn: JSX.Element,
  playNextBtn: JSX.Element,
  close: () => void
}) {
  let playerSection!: HTMLDivElement;
  onMount(() => {
    playerSection.scrollIntoView({ behavior: 'smooth' });
  });

  const auxCtrls = [
    [
      _.likeBtn,
      <i data-translation-aria-label="player_loop" class="ri-repeat-line" id="loopButton"></i>
    ],
    [
      <button data-translation-aria-label="player_play_previous" class="ri-skip-back-line"
        id="playPrevButton"></button>,
      _.playNextBtn
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

  return (
    <section
      id="playerSection"
      ref={playerSection}>

      <span class="topShelf">

        <i
          onclick={(e) => {
            setCtrlIdx((ctrlIdx() + 1) % auxCtrls.length);
            (e.target as HTMLElement).style.transform = `rotateZ(-${120 * ctrlIdx()}deg)`;
          }}
          class="ri-loop-left-line"></i>
        <i
          onclick={_.close}
          class="ri-close-large-line"></i>

      </span>

      {_.img}

      {_.track}

      <span class="slider">
        <input type="range" value="50" id="progress" />
        <div>
          <p id="currentDuration">00:00</p>
          <p id="fullDuration">00:00</p>
        </div>
      </span>

      <div class="mainShelf">
        {auxCtrls[ctrlIdx()][0]}

        <button data-translation-aria-label="player_seek_backward" class="ri-replay-15-line"
          id="seekBwdButton"></button>
        {_.playBtn}

        <button data-translation-aria-label="player_seek_forward" class="ri-forward-15-line"
          id="seekFwdButton"></button>

        {auxCtrls[ctrlIdx()][1]}
      </div>
    </section>
  )
}
