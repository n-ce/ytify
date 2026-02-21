import { playNext, t } from '@stores';

export default function PlayNextButton() {
  return (
    <button
      aria-label={t('player_play_next')}
      class="ri-skip-forward-fill"
      id="playNextButton"
      onclick={playNext}
    ></button>
  );
}
