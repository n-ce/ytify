/**
 * Music Providers Index
 * Unified export and aggregation methods for all providers
 */

import { spotifyProvider } from './spotify';
import { deezerProvider } from './deezer';
import { soundcloudProvider } from './soundcloud';
import type { MusicProvider, MusicTrack, MusicPlaylist, ProviderType } from './types';

export type { MusicProvider, MusicTrack, MusicPlaylist, ProviderType };

export const providers: Record<ProviderType, MusicProvider> = {
  spotify: spotifyProvider,
  deezer: deezerProvider,
  soundcloud: soundcloudProvider
};

/**
 * Get all connected provider names
 */
export function getConnectedProviders(): ProviderType[] {
  return (Object.keys(providers) as ProviderType[])
    .filter(key => providers[key].isAuthenticated);
}

/**
 * Aggregate playlists from all connected providers
 */
export function getAllPlaylists(): Promise<MusicPlaylist[]> {
  const authenticatedProviders = Object.values(providers).filter(p => p.isAuthenticated);
  
  return Promise.allSettled(authenticatedProviders.map(p => p.getPlaylists()))
    .then(results => results
      .filter((r): r is PromiseFulfilledResult<MusicPlaylist[]> => r.status === 'fulfilled')
      .flatMap(r => r.value));
}

/**
 * Aggregate favorites from all connected providers
 */
export function getAllFavorites(): Promise<MusicTrack[]> {
  const authenticatedProviders = Object.values(providers).filter(p => p.isAuthenticated);
  
  return Promise.allSettled(authenticatedProviders.map(p => p.getFavorites()))
    .then(results => results
      .filter((r): r is PromiseFulfilledResult<MusicTrack[]> => r.status === 'fulfilled')
      .flatMap(r => r.value));
}

/**
 * Aggregate recently played from all connected providers
 */
export function getAllRecentlyPlayed(): Promise<MusicTrack[]> {
  const authenticatedProviders = Object.values(providers).filter(p => p.isAuthenticated);
  
  return Promise.allSettled(authenticatedProviders.map(p => p.getRecentlyPlayed()))
    .then(results => results
      .filter((r): r is PromiseFulfilledResult<MusicTrack[]> => r.status === 'fulfilled')
      .flatMap(r => r.value));
}

/**
 * Search across all connected providers
 */
export function universalSearch(query: string): Promise<MusicTrack[]> {
  const authenticatedProviders = Object.values(providers).filter(p => p.isAuthenticated);
  
  return Promise.allSettled(authenticatedProviders.map(p => p.search(query)))
    .then(results => results
      .filter((r): r is PromiseFulfilledResult<MusicTrack[]> => r.status === 'fulfilled')
      .flatMap(r => r.value));
}

/**
 * Get stream URL for a track (uses YouTube matching for Spotify/Deezer)
 */
export function getStreamUrl(track: MusicTrack): Promise<string> {
  const provider = providers[track.provider as ProviderType];
  if (!provider) {
    return Promise.reject(new Error(`Unknown provider: ${track.provider}`));
  }
  return provider.getStreamUrl(track);
}
