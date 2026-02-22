import { playerStore, playNext, playPrev, queueStore } from "@stores";

export function initMediaSession() {
  if (!('mediaSession' in navigator)) return;

  const msn = navigator.mediaSession;

  msn.setActionHandler('play', () => {
    playerStore.audio.play();
  });

  msn.setActionHandler('pause', () => {
    playerStore.audio.pause();
  });

  msn.setActionHandler('seekbackward', (details) => {
    const skipTime = details.seekOffset || 15;
    playerStore.audio.currentTime = Math.max(playerStore.audio.currentTime - skipTime, 0);
  });

  msn.setActionHandler('seekforward', (details) => {
    const skipTime = details.seekOffset || 15;
    playerStore.audio.currentTime = Math.min(playerStore.audio.currentTime + skipTime, playerStore.audio.duration);
  });

  msn.setActionHandler('previoustrack', () => {
    if (playerStore.history.length) {
      playPrev();
    }
  });

  msn.setActionHandler('nexttrack', () => {
    if (queueStore.list.length) {
      playNext();
    }
  });

  msn.setActionHandler('stop', () => {
    playerStore.audio.pause();
    playerStore.audio.currentTime = 0;
  });

  msn.setActionHandler('seekto', (details) => {
    if (details.seekTime !== undefined) {
      playerStore.audio.currentTime = details.seekTime;
    }
  });
}

export function updateMediaSessionPosition() {
  if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;

  const { audio } = playerStore;
  if (!isNaN(audio.duration) && audio.duration > 0) {
    try {
        navigator.mediaSession.setPositionState({
          duration: audio.duration,
          playbackRate: audio.playbackRate || 1,
          position: audio.currentTime,
        });
    } catch (e) {
        console.error("Error updating media session position state:", e);
    }
  }
}

export function updateMediaSessionPlaybackState(state: 'playing' | 'paused' | 'none') {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = state === 'none' ? 'none' : (state === 'playing' ? 'playing' : 'paused');
}
