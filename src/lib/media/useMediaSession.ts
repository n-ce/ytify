/**
 * SolidJS hook for Media Session API integration.
 * Provides reactive media session management for SolidJS components.
 * @module useMediaSession
 */

import { createEffect, onCleanup, createMemo } from 'solid-js';
import {
  initMediaSession,
  updateMediaMetadata,
  updatePlaybackState,
  updatePositionState,
  cleanupMediaSession,
  generateArtworkArray,
  isMediaSessionSupported,
  type MediaSessionHandlers,
} from './mediaSession';

/**
 * Configuration options for the useMediaSession hook.
 * All properties are reactive when wrapped in an accessor function.
 */
export interface UseMediaSessionOptions {
  /** Track title */
  title: string;
  /** Artist name */
  artist: string;
  /** Album name (optional) */
  album?: string;
  /** URL to the track artwork (will be used to generate multiple sizes) */
  artworkUrl?: string;
  /** Total duration of the track in seconds */
  duration: number;
  /** Current playback position in seconds */
  currentTime: number;
  /** Whether playback is currently active */
  isPlaying: boolean;
  /** Callback when play is requested from external controls */
  onPlay: () => void;
  /** Callback when pause is requested from external controls */
  onPause: () => void;
  /** Callback when seeking to a specific time (receives time in seconds) */
  onSeek: (time: number) => void;
  /** Callback when next track is requested */
  onNext: () => void;
  /** Callback when previous track is requested */
  onPrevious: () => void;
}

/**
 * Default seek offset in seconds for forward/backward seeking.
 * Common values are 10 or 30 seconds.
 */
const DEFAULT_SEEK_OFFSET = 10;

/**
 * Minimum interval between position state updates in milliseconds.
 * Prevents excessive updates during rapid playback position changes.
 */
const POSITION_UPDATE_INTERVAL = 1000;

/**
 * SolidJS hook for integrating with the Media Session API.
 * Automatically updates media metadata, playback state, and position state
 * based on reactive options. Handles cleanup on component unmount.
 * 
 * This hook is designed for use with CarPlay, Android Auto, and system media controls.
 * It provides:
 * - Automatic metadata updates when track changes
 * - Playback state synchronization
 * - Position state updates for seek bar display
 * - Action handler registration for external control events
 * 
 * @param getOptions - Accessor function returning UseMediaSessionOptions
 * 
 * @example
 * ```tsx
 * import { useMediaSession } from '@/lib/media/useMediaSession';
 * 
 * function Player() {
 *   const [isPlaying, setIsPlaying] = createSignal(false);
 *   const [currentTime, setCurrentTime] = createSignal(0);
 *   
 *   useMediaSession(() => ({
 *     title: track().title,
 *     artist: track().artist,
 *     album: track().album,
 *     artworkUrl: track().thumbnailUrl,
 *     duration: track().duration,
 *     currentTime: currentTime(),
 *     isPlaying: isPlaying(),
 *     onPlay: () => { audioRef.play(); setIsPlaying(true); },
 *     onPause: () => { audioRef.pause(); setIsPlaying(false); },
 *     onSeek: (time) => { audioRef.currentTime = time; setCurrentTime(time); },
 *     onNext: () => playNextTrack(),
 *     onPrevious: () => playPreviousTrack(),
 *   }));
 *   
 *   return <audio ref={audioRef} ... />;
 * }
 * ```
 */
export function useMediaSession(getOptions: () => UseMediaSessionOptions): void {
  // Early return if Media Session API is not supported
  if (!isMediaSessionSupported()) {
    return;
  }

  // Track last position update time for throttling
  let lastPositionUpdate = 0;

  // Memoize handlers to prevent recreating on every render
  const handlers = createMemo<MediaSessionHandlers>(() => {
    const options = getOptions();
    
    return {
      onPlay: options.onPlay,
      onPause: options.onPause,
      onSeekBackward: (details) => {
        const opts = getOptions();
        const offset = details?.seekOffset ?? DEFAULT_SEEK_OFFSET;
        const newTime = Math.max(0, opts.currentTime - offset);
        opts.onSeek(newTime);
      },
      onSeekForward: (details) => {
        const opts = getOptions();
        const offset = details?.seekOffset ?? DEFAULT_SEEK_OFFSET;
        const newTime = Math.min(opts.duration, opts.currentTime + offset);
        opts.onSeek(newTime);
      },
      onPreviousTrack: options.onPrevious,
      onNextTrack: options.onNext,
      onStop: () => {
        const opts = getOptions();
        opts.onPause();
        opts.onSeek(0);
      },
      onSeekTo: (details) => {
        options.onSeek(details.seekTime);
      },
    };
  });

  // Initialize media session handlers once
  createEffect(() => {
    const currentHandlers = handlers();
    initMediaSession(currentHandlers);
  });

  // Update metadata when track info changes
  createEffect(() => {
    const options = getOptions();
    
    // Only update if we have valid track info
    if (!options.title) return;

    updateMediaMetadata({
      title: options.title,
      artist: options.artist,
      album: options.album,
      artwork: options.artworkUrl 
        ? generateArtworkArray(options.artworkUrl) 
        : undefined,
    });
  });

  // Update playback state when playing status changes
  createEffect(() => {
    const options = getOptions();
    updatePlaybackState(options.isPlaying ? 'playing' : 'paused');
  });

  // Update position state (throttled for performance)
  createEffect(() => {
    const options = getOptions();
    const now = Date.now();
    
    // Only update if enough time has passed since last update
    // or if this is a significant position change (e.g., seek)
    if (now - lastPositionUpdate >= POSITION_UPDATE_INTERVAL) {
      if (options.duration > 0) {
        updatePositionState(options.duration, options.currentTime);
        lastPositionUpdate = now;
      }
    }
  });

  // Cleanup on unmount
  onCleanup(() => {
    cleanupMediaSession();
  });
}

/**
 * Extended options for useMediaSession with additional customization.
 */
export interface UseMediaSessionExtendedOptions extends UseMediaSessionOptions {
  /** Custom seek offset in seconds (defaults to 10) */
  seekOffset?: number;
  /** Position update interval in milliseconds (defaults to 1000) */
  positionUpdateInterval?: number;
  /** Custom playback rate (defaults to 1.0) */
  playbackRate?: number;
}

/**
 * Extended version of useMediaSession with additional customization options.
 * Provides more control over seek behavior and position update frequency.
 * 
 * @param getOptions - Accessor function returning UseMediaSessionExtendedOptions
 * 
 * @example
 * ```tsx
 * useMediaSessionExtended(() => ({
 *   title: track().title,
 *   artist: track().artist,
 *   duration: track().duration,
 *   currentTime: currentTime(),
 *   isPlaying: isPlaying(),
 *   onPlay: play,
 *   onPause: pause,
 *   onSeek: seek,
 *   onNext: nextTrack,
 *   onPrevious: previousTrack,
 *   seekOffset: 30, // 30 second skip
 *   positionUpdateInterval: 500, // Update position every 500ms
 *   playbackRate: 1.5, // 1.5x playback speed
 * }));
 * ```
 */
export function useMediaSessionExtended(
  getOptions: () => UseMediaSessionExtendedOptions
): void {
  // Early return if Media Session API is not supported
  if (!isMediaSessionSupported()) {
    return;
  }

  // Track last position update time for throttling
  let lastPositionUpdate = 0;

  // Memoize handlers with custom seek offset
  const handlers = createMemo<MediaSessionHandlers>(() => {
    const options = getOptions();
    const seekOffset = options.seekOffset ?? DEFAULT_SEEK_OFFSET;
    
    return {
      onPlay: options.onPlay,
      onPause: options.onPause,
      onSeekBackward: (details) => {
        const opts = getOptions();
        const offset = details?.seekOffset ?? seekOffset;
        const newTime = Math.max(0, opts.currentTime - offset);
        opts.onSeek(newTime);
      },
      onSeekForward: (details) => {
        const opts = getOptions();
        const offset = details?.seekOffset ?? seekOffset;
        const newTime = Math.min(opts.duration, opts.currentTime + offset);
        opts.onSeek(newTime);
      },
      onPreviousTrack: options.onPrevious,
      onNextTrack: options.onNext,
      onStop: () => {
        const opts = getOptions();
        opts.onPause();
        opts.onSeek(0);
      },
      onSeekTo: (details) => {
        options.onSeek(details.seekTime);
      },
    };
  });

  // Initialize media session handlers
  createEffect(() => {
    const currentHandlers = handlers();
    initMediaSession(currentHandlers);
  });

  // Update metadata when track info changes
  createEffect(() => {
    const options = getOptions();
    
    if (!options.title) return;

    updateMediaMetadata({
      title: options.title,
      artist: options.artist,
      album: options.album,
      artwork: options.artworkUrl 
        ? generateArtworkArray(options.artworkUrl) 
        : undefined,
    });
  });

  // Update playback state when playing status changes
  createEffect(() => {
    const options = getOptions();
    updatePlaybackState(options.isPlaying ? 'playing' : 'paused');
  });

  // Update position state with custom interval and playback rate
  createEffect(() => {
    const options = getOptions();
    const updateInterval = options.positionUpdateInterval ?? POSITION_UPDATE_INTERVAL;
    const now = Date.now();
    
    if (now - lastPositionUpdate >= updateInterval) {
      if (options.duration > 0) {
        updatePositionState(
          options.duration,
          options.currentTime,
          options.playbackRate ?? 1.0
        );
        lastPositionUpdate = now;
      }
    }
  });

  // Cleanup on unmount
  onCleanup(() => {
    cleanupMediaSession();
  });
}

export default useMediaSession;
