/**
 * Deezer Provider
 * Handles OAuth authentication and API calls to Deezer
 * Note: Deezer API only allows 30s previews, full playback uses YouTube matching
 */

import type { MusicProvider, MusicTrack, MusicPlaylist } from './types';

const DEEZER_API_URL = 'https://api.deezer.com';

class DeezerProvider implements MusicProvider {
  readonly name = 'Deezer';
  private accessToken: string | null = null;
  
  get isAuthenticated(): boolean {
    return !!this.accessToken;
  }
  
  constructor() {
    this.accessToken = localStorage.getItem('deezer_access_token');
  }
  
  authenticate(): Promise<void> {
    const appId = import.meta.env.VITE_DEEZER_APP_ID;
    if (!appId) {
      console.warn('Deezer App ID not configured');
      return Promise.resolve();
    }
    
    const redirectUri = `${window.location.origin}/callback/deezer`;
    const perms = 'basic_access,email,offline_access,manage_library,listening_history';
    
    window.location.href = `https://connect.deezer.com/oauth/auth.php?app_id=${appId}&redirect_uri=${redirectUri}&perms=${perms}`;
    return Promise.resolve();
  }
  
  logout(): Promise<void> {
    localStorage.removeItem('deezer_access_token');
    this.accessToken = null;
    return Promise.resolve();
  }
  
  private request<T>(endpoint: string): Promise<T> {
    if (!this.accessToken) return Promise.reject(new Error('Not authenticated'));
    
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${DEEZER_API_URL}${endpoint}${separator}access_token=${this.accessToken}`;
    
    return fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`Deezer API error: ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (data.error) throw new Error(data.error.message);
        return data as T;
      });
  }
  
  getPlaylists(): Promise<MusicPlaylist[]> {
    return this.request<DeezerPlaylistsResponse>('/user/me/playlists')
      .then(data => data.data.map(p => ({
        id: String(p.id),
        provider: 'deezer' as const,
        name: p.title,
        artwork: p.picture_medium,
        trackCount: p.nb_tracks,
        owner: p.creator.name,
        isPublic: p.public
      })));
  }
  
  getPlaylistTracks(playlistId: string): Promise<MusicTrack[]> {
    return this.request<DeezerTracksResponse>(`/playlist/${playlistId}/tracks`)
      .then(data => data.data.map(t => this.mapTrack(t)));
  }
  
  getFavorites(): Promise<MusicTrack[]> {
    return this.request<DeezerTracksResponse>('/user/me/tracks')
      .then(data => data.data.map(t => this.mapTrack(t)));
  }
  
  getRecentlyPlayed(): Promise<MusicTrack[]> {
    return this.request<DeezerTracksResponse>('/user/me/history')
      .then(data => data.data.map(t => this.mapTrack(t)));
  }
  
  search(query: string): Promise<MusicTrack[]> {
    return this.request<DeezerTracksResponse>(`/search?q=${encodeURIComponent(query)}`)
      .then(data => data.data.map(t => this.mapTrack(t)));
  }
  
  getStreamUrl(track: MusicTrack): Promise<string> {
    // Same pattern as Spotify - match to YouTube
    const searchQuery = `${track.artist} ${track.title}`;
    return fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`)
      .then(response => response.json())
      .then(data => data.videoId || track.previewUrl || '');
  }
  
  private mapTrack(track: DeezerTrack): MusicTrack {
    return {
      id: String(track.id),
      provider: 'deezer',
      title: track.title,
      artist: track.artist.name,
      album: track.album?.title,
      duration: track.duration,
      artwork: track.album?.cover_medium,
      previewUrl: track.preview,
      externalUrl: track.link
    };
  }
}

// Deezer API Types
interface DeezerTrack {
  id: number;
  title: string;
  duration: number;
  preview: string;
  link: string;
  artist: { id: number; name: string };
  album?: { id: number; title: string; cover_medium: string };
}

interface DeezerTracksResponse {
  data: DeezerTrack[];
}

interface DeezerPlaylistsResponse {
  data: Array<{
    id: number;
    title: string;
    picture_medium: string;
    nb_tracks: number;
    public: boolean;
    creator: { name: string };
  }>;
}

export const deezerProvider = new DeezerProvider();
