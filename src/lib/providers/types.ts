/**
 * Music Provider Types
 * Unified interface for Spotify, Deezer, SoundCloud integrations
 */

export interface MusicTrack {
  id: string;
  provider: 'spotify' | 'deezer' | 'soundcloud' | 'youtube';
  title: string;
  artist: string;
  album?: string;
  duration: number; // seconds
  artwork?: string;
  streamUrl?: string;
  previewUrl?: string;
  externalUrl: string;
}

export interface MusicPlaylist {
  id: string;
  provider: 'spotify' | 'deezer' | 'soundcloud' | 'youtube';
  name: string;
  description?: string;
  artwork?: string;
  trackCount: number;
  owner: string;
  isPublic: boolean;
}

export interface MusicProvider {
  readonly name: string;
  readonly isAuthenticated: boolean;
  
  // Authentication
  authenticate(): Promise<void>;
  logout(): Promise<void>;
  
  // Library
  getPlaylists(): Promise<MusicPlaylist[]>;
  getPlaylistTracks(playlistId: string): Promise<MusicTrack[]>;
  getFavorites(): Promise<MusicTrack[]>;
  getRecentlyPlayed(): Promise<MusicTrack[]>;
  
  // Search
  search(query: string): Promise<MusicTrack[]>;
  
  // Stream (returns YouTube match or preview URL)
  getStreamUrl(track: MusicTrack): Promise<string>;
}

export type ProviderType = 'spotify' | 'deezer' | 'soundcloud';
