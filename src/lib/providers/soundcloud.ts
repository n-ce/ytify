/**
 * SoundCloud Provider
 * Handles OAuth authentication and API calls to SoundCloud
 * Note: SoundCloud allows streaming for some tracks depending on license
 */

import type { MusicProvider, MusicTrack, MusicPlaylist } from './types';

const SC_API_URL = 'https://api.soundcloud.com';

class SoundCloudProvider implements MusicProvider {
  readonly name = 'SoundCloud';
  private accessToken: string | null = null;
  
  get isAuthenticated(): boolean {
    return !!this.accessToken;
  }
  
  constructor() {
    this.accessToken = localStorage.getItem('soundcloud_access_token');
  }
  
  authenticate(): Promise<void> {
    const clientId = import.meta.env.VITE_SOUNDCLOUD_CLIENT_ID;
    if (!clientId) {
      console.warn('SoundCloud Client ID not configured');
      return Promise.resolve();
    }
    
    const redirectUri = `${window.location.origin}/callback/soundcloud`;
    
    window.location.href = `https://soundcloud.com/connect?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=non-expiring`;
    return Promise.resolve();
  }
  
  logout(): Promise<void> {
    localStorage.removeItem('soundcloud_access_token');
    this.accessToken = null;
    return Promise.resolve();
  }
  
  private request<T>(endpoint: string): Promise<T> {
    if (!this.accessToken) return Promise.reject(new Error('Not authenticated'));
    
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${SC_API_URL}${endpoint}${separator}oauth_token=${this.accessToken}`;
    
    return fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`SoundCloud API error: ${response.status}`);
        return response.json() as Promise<T>;
      });
  }
  
  getPlaylists(): Promise<MusicPlaylist[]> {
    return this.request<SCPlaylist[]>('/me/playlists')
      .then(data => data.map(p => ({
        id: String(p.id),
        provider: 'soundcloud' as const,
        name: p.title,
        description: p.description,
        artwork: p.artwork_url,
        trackCount: p.track_count,
        owner: p.user.username,
        isPublic: p.sharing === 'public'
      })));
  }
  
  getPlaylistTracks(playlistId: string): Promise<MusicTrack[]> {
    return this.request<SCPlaylist>(`/playlists/${playlistId}`)
      .then(data => data.tracks.map(t => this.mapTrack(t)));
  }
  
  getFavorites(): Promise<MusicTrack[]> {
    return this.request<SCTrack[]>('/me/likes/tracks')
      .then(data => data.map(t => this.mapTrack(t)));
  }
  
  getRecentlyPlayed(): Promise<MusicTrack[]> {
    // SoundCloud doesn't have a history endpoint - return empty
    return Promise.resolve([]);
  }
  
  search(query: string): Promise<MusicTrack[]> {
    return this.request<SCTrack[]>(`/tracks?q=${encodeURIComponent(query)}`)
      .then(data => data.map(t => this.mapTrack(t)));
  }
  
  getStreamUrl(track: MusicTrack): Promise<string> {
    // SoundCloud allows streaming for some tracks
    return this.request<SCTrack>(`/tracks/${track.id}`)
      .then(scTrack => {
        if (scTrack.streamable && scTrack.stream_url) {
          return `${scTrack.stream_url}?oauth_token=${this.accessToken}`;
        }
        // Fallback to YouTube match
        const searchQuery = `${track.artist} ${track.title}`;
        return fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`)
          .then(response => response.json())
          .then(data => data.videoId || '');
      });
  }
  
  private mapTrack(track: SCTrack): MusicTrack {
    return {
      id: String(track.id),
      provider: 'soundcloud',
      title: track.title,
      artist: track.user.username,
      duration: Math.floor(track.duration / 1000),
      artwork: track.artwork_url,
      streamUrl: track.streamable ? track.stream_url : undefined,
      externalUrl: track.permalink_url
    };
  }
}

// SoundCloud API Types
interface SCTrack {
  id: number;
  title: string;
  duration: number;
  artwork_url: string;
  stream_url: string;
  streamable: boolean;
  permalink_url: string;
  user: { username: string };
}

interface SCPlaylist {
  id: number;
  title: string;
  description: string;
  artwork_url: string;
  track_count: number;
  sharing: string;
  user: { username: string };
  tracks: SCTrack[];
}

export const soundcloudProvider = new SoundCloudProvider();
