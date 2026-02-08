/**
 * Media Session API integration for CarPlay, Android Auto, and system media controls.
 * Provides functions to manage media playback metadata and handle external media controls.
 * @module mediaSession
 */

/**
 * Artwork configuration for media metadata.
 * Multiple sizes are recommended for different display contexts (system controls, car displays, etc.)
 */
export interface MediaArtwork {
  /** URL to the artwork image */
  src: string;
  /** Size in format "WIDTHxHEIGHT" (e.g., "512x512") */
  sizes: string;
  /** MIME type of the image (e.g., "image/png", "image/jpeg") */
  type: string;
}

/**
 * Media metadata for the currently playing track.
 * Used to display information in system media controls, lock screen, CarPlay, Android Auto, etc.
 */
export interface MediaMetadata {
  /** Track title */
  title: string;
  /** Artist name */
  artist: string;
  /** Album name (optional) */
  album?: string;
  /** Artwork images in various sizes for different display contexts */
  artwork?: MediaArtwork[];
}

/**
 * Handler callbacks for media session actions.
 * These are triggered by system media controls, CarPlay, Android Auto, headphone buttons, etc.
 */
export interface MediaSessionHandlers {
  /** Called when play is requested */
  onPlay: () => void;
  /** Called when pause is requested */
  onPause: () => void;
  /** Called when seek backward is requested (typically 10-30 seconds) */
  onSeekBackward: (details?: { seekOffset?: number }) => void;
  /** Called when seek forward is requested (typically 10-30 seconds) */
  onSeekForward: (details?: { seekOffset?: number }) => void;
  /** Called when previous track is requested */
  onPreviousTrack: () => void;
  /** Called when next track is requested */
  onNextTrack: () => void;
  /** Called when stop is requested (often used for ending playback completely) */
  onStop: () => void;
  /** Called when seeking to a specific time (used by seek bars in car displays) */
  onSeekTo?: (details: { seekTime: number; fastSeek?: boolean }) => void;
}

/**
 * Standard artwork sizes for different display contexts.
 * Larger sizes (512x512) are recommended for CarPlay/Android Auto displays.
 */
const ARTWORK_SIZES = ['96x96', '128x128', '192x192', '256x256', '384x384', '512x512'] as const;

/**
 * Checks if the Media Session API is available in the current environment.
 * Handles SSR and browsers that don't support the API.
 * @returns true if Media Session API is supported
 */
export function isMediaSessionSupported(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator;
}

/**
 * Generates artwork array from a base URL with multiple sizes.
 * Creates optimized artwork for various display contexts including CarPlay/Android Auto
 * which require larger images (512x512 minimum recommended).
 * 
 * @param baseUrl - Base URL for artwork (the function appends size parameters if supported)
 * @param mimeType - MIME type of the image (defaults to 'image/jpeg')
 * @returns Array of artwork objects with different sizes
 * 
 * @example
 * ```typescript
 * const artwork = generateArtworkArray('https://example.com/album-art.jpg');
 * // Returns array with sizes: 96x96, 128x128, 192x192, 256x256, 384x384, 512x512
 * ```
 */
export function generateArtworkArray(baseUrl: string, mimeType: string = 'image/jpeg'): MediaArtwork[] {
  if (!baseUrl) return [];
  
  return ARTWORK_SIZES.map(size => ({
    src: baseUrl,
    sizes: size,
    type: mimeType,
  }));
}

/**
 * Initializes the Media Session API with action handlers.
 * This sets up listeners for media control events from system UI, CarPlay, Android Auto, etc.
 * 
 * @param handlers - Object containing callback functions for each media action
 * 
 * @example
 * ```typescript
 * initMediaSession({
 *   onPlay: () => audioElement.play(),
 *   onPause: () => audioElement.pause(),
 *   onSeekBackward: (details) => { audioElement.currentTime -= details?.seekOffset ?? 10; },
 *   onSeekForward: (details) => { audioElement.currentTime += details?.seekOffset ?? 10; },
 *   onPreviousTrack: () => playPrevious(),
 *   onNextTrack: () => playNext(),
 *   onStop: () => { audioElement.pause(); audioElement.currentTime = 0; },
 *   onSeekTo: (details) => { audioElement.currentTime = details.seekTime; },
 * });
 * ```
 */
export function initMediaSession(handlers: MediaSessionHandlers): void {
  if (!isMediaSessionSupported()) {
    console.warn('Media Session API is not supported in this browser');
    return;
  }

  const mediaSession = navigator.mediaSession;

  // Core playback controls
  mediaSession.setActionHandler('play', () => {
    handlers.onPlay();
  });

  mediaSession.setActionHandler('pause', () => {
    handlers.onPause();
  });

  // Seek controls (important for car displays with progress bars)
  mediaSession.setActionHandler('seekbackward', (details) => {
    handlers.onSeekBackward(details ? { seekOffset: details.seekOffset ?? undefined } : undefined);
  });

  mediaSession.setActionHandler('seekforward', (details) => {
    handlers.onSeekForward(details ? { seekOffset: details.seekOffset ?? undefined } : undefined);
  });

  // Track navigation
  mediaSession.setActionHandler('previoustrack', () => {
    handlers.onPreviousTrack();
  });

  mediaSession.setActionHandler('nexttrack', () => {
    handlers.onNextTrack();
  });

  // Stop action (some systems use this instead of pause)
  mediaSession.setActionHandler('stop', () => {
    handlers.onStop();
  });

  // Seek to specific position (used by CarPlay/Android Auto seek bars)
  if (handlers.onSeekTo) {
    mediaSession.setActionHandler('seekto', (details) => {
      if (details && typeof details.seekTime === 'number') {
        handlers.onSeekTo!({
          seekTime: details.seekTime,
          fastSeek: details.fastSeek ?? false,
        });
      }
    });
  }
}

/**
 * Updates the media metadata displayed in system controls, lock screen, CarPlay, Android Auto.
 * Call this when the current track changes.
 * 
 * @param metadata - Object containing track information (title, artist, album, artwork)
 * 
 * @example
 * ```typescript
 * updateMediaMetadata({
 *   title: 'Song Title',
 *   artist: 'Artist Name',
 *   album: 'Album Name',
 *   artwork: [
 *     { src: 'https://example.com/art-512.jpg', sizes: '512x512', type: 'image/jpeg' }
 *   ]
 * });
 * ```
 */
export function updateMediaMetadata(metadata: MediaMetadata): void {
  if (!isMediaSessionSupported()) {
    return;
  }

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: metadata.title || 'Unknown Title',
      artist: metadata.artist || 'Unknown Artist',
      album: metadata.album || '',
      artwork: metadata.artwork || [],
    });
  } catch (error) {
    console.error('Failed to update media metadata:', error);
  }
}

/**
 * Updates the playback state shown in system media controls.
 * This affects the play/pause button state and other UI elements.
 * 
 * @param state - Current playback state: 'playing', 'paused', or 'none'
 * 
 * @example
 * ```typescript
 * // When playback starts
 * updatePlaybackState('playing');
 * 
 * // When playback pauses
 * updatePlaybackState('paused');
 * 
 * // When no media is loaded
 * updatePlaybackState('none');
 * ```
 */
export function updatePlaybackState(state: 'playing' | 'paused' | 'none'): void {
  if (!isMediaSessionSupported()) {
    return;
  }

  try {
    navigator.mediaSession.playbackState = state;
  } catch (error) {
    console.error('Failed to update playback state:', error);
  }
}

/**
 * Updates the position state for seek bar display in system controls and car displays.
 * This is essential for CarPlay/Android Auto to show accurate progress and enable seeking.
 * Call this regularly (e.g., every second) during playback.
 * 
 * @param duration - Total duration of the track in seconds
 * @param position - Current playback position in seconds
 * @param playbackRate - Current playback rate (defaults to 1.0 for normal speed)
 * 
 * @example
 * ```typescript
 * // Update position every second during playback
 * const interval = setInterval(() => {
 *   updatePositionState(audioElement.duration, audioElement.currentTime, audioElement.playbackRate);
 * }, 1000);
 * ```
 */
export function updatePositionState(
  duration: number,
  position: number,
  playbackRate: number = 1.0
): void {
  if (!isMediaSessionSupported()) {
    return;
  }

  // Validate inputs to prevent errors
  if (!Number.isFinite(duration) || duration <= 0) {
    return;
  }

  if (!Number.isFinite(position) || position < 0) {
    position = 0;
  }

  // Ensure position doesn't exceed duration
  position = Math.min(position, duration);

  try {
    navigator.mediaSession.setPositionState({
      duration,
      position,
      playbackRate,
    });
  } catch (error) {
    console.error('Failed to update position state:', error);
  }
}

/**
 * Cleans up media session by removing all action handlers and resetting state.
 * Call this when the player component unmounts or the app is closing.
 * 
 * @example
 * ```typescript
 * // In cleanup/unmount
 * cleanupMediaSession();
 * ```
 */
export function cleanupMediaSession(): void {
  if (!isMediaSessionSupported()) {
    return;
  }

  const mediaSession = navigator.mediaSession;

  // Remove all action handlers
  const actions: MediaSessionAction[] = [
    'play',
    'pause',
    'seekbackward',
    'seekforward',
    'previoustrack',
    'nexttrack',
    'stop',
    'seekto',
  ];

  for (const action of actions) {
    try {
      mediaSession.setActionHandler(action, null);
    } catch {
      // Some actions might not be supported, ignore errors
    }
  }

  // Reset metadata and playback state
  try {
    mediaSession.metadata = null;
    mediaSession.playbackState = 'none';
  } catch (error) {
    console.error('Failed to cleanup media session:', error);
  }
}

/**
 * Creates a throttled version of updatePositionState for performance optimization.
 * Useful for high-frequency updates during playback (e.g., from timeupdate events).
 * 
 * @param intervalMs - Minimum interval between updates in milliseconds (defaults to 1000ms)
 * @returns Throttled update function
 * 
 * @example
 * ```typescript
 * const throttledUpdate = createThrottledPositionUpdater(1000);
 * 
 * audioElement.addEventListener('timeupdate', () => {
 *   throttledUpdate(audioElement.duration, audioElement.currentTime);
 * });
 * ```
 */
export function createThrottledPositionUpdater(
  intervalMs: number = 1000
): (duration: number, position: number, playbackRate?: number) => void {
  let lastUpdate = 0;

  return (duration: number, position: number, playbackRate: number = 1.0) => {
    const now = Date.now();
    if (now - lastUpdate >= intervalMs) {
      updatePositionState(duration, position, playbackRate);
      lastUpdate = now;
    }
  };
}
