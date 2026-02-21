import { playerStore, t } from "@stores";

export default function() {

  const icons = {
    playing: 'ri-pause-circle-fill',
    none: 'ri-stop-circle-fill',
    paused: 'ri-play-circle-fill',
    loading: 'ri-loader-3-line loading-spinner'
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
