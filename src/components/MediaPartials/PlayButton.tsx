import { playerStore, t } from "../../lib/stores";

export default function() {

  const icons = {
    playing: 'ri-pause-circle-fill',
    none: 'ri-stop-circle-fill',
    paused: 'ri-play-circle-fill',
    loading: 'ri-loader-3-line'
  }

  return (
    <button
      class={icons[playerStore.playbackState]}
      id="playButton"
      onclick={() => {
        const { stream, playbackState, audio } = playerStore;
        if (
          stream.id &&
          playbackState === 'playing'
        )
          audio.pause();
        else
          audio.play();
      }}
      aria-label={t('player_play_button')}
    ></button>
  );
}
