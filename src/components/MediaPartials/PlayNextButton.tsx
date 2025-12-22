import { playNext, t } from '@lib/stores';

export default function PlayNextButton() {
  return (
    <button
      aria-label={t('player_play_next')}
      class="ri-skip-forward-line"
      id="playNextButton"
      onclick={playNext}
    ></button>
  );
}
