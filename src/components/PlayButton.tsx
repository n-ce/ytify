import { store } from "../lib/store";

export default function() {

  const icons = {
    playing: 'ri-play-circle-fill',
    none: 'ri-stop-circle-fill',
    paused: 'ri-pause-circle-fill',
    loading: 'ri-loading-3-line'
  }

  return (
    <button
      class={icons[store.player.playbackState]}
      id="playButton"
      aria-label="player_play_button"
      data-playbackState={store.player.playbackState}

    ></button>
  );
}
