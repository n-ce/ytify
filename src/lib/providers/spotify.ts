/**
 * Spotify Provider (Refactored)
 * Uses SolidJS reactive store for UI updates
 * Refresh token stored in HttpOnly cookie (not localStorage)
 */

import type { MusicProvider, MusicTrack, MusicPlaylist } from './types';
import { 
  providerState, 
  setProviderLoading, 
  setProviderConnected, 
  setProviderDisconnected,
  setProviderError 
} from './store';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

class SpotifyProvider implements MusicProvider {
  readonly name = 'Spotify';
  
  // Use reactive store for isAuthenticated
  get isAuthenticated(): boolean {
    return providerState.spotify.isConnected;
  }
  
  private get accessToken(): string | null {
    return localStorage.getItem('spotify_access_token');
  }
  
  authenticate(): Promise<void> {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    if (!clientId) {
      setProviderError('spotify', 'Spotify Client ID not configured');
      return Promise.resolve();
    }
    
    setProviderLoading('spotify', true);
    
    const redirectUri = `${window.location.origin}/callback/spotify`;
    const scopes = [
      'user-library-read',
      'user-read-recently-played',
      'playlist-read-private',
      'playlist-read-collaborative'
    ].join(' ');
    
    // Store state for CSRF protection
    const state = crypto.randomUUID();
    sessionStorage.setItem('spotify_auth_state', state);
    
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      state
    });
    
    window.location.href = `${SPOTIFY_AUTH_URL}?${params}`;
    return Promise.resolve();
  }
  
  /**
   * Handle OAuth callback - exchange code for tokens
   * Called from the callback page
   */
  handleCallback(code: string, state: string): Promise<void> {
    const savedState = sessionStorage.getItem('spotify_auth_state');
    if (state !== savedState) {
      setProviderError('spotify', 'Invalid state parameter');
      return Promise.reject(new Error('CSRF validation failed'));
    }
    
    sessionStorage.removeItem('spotify_auth_state');
    setProviderLoading('spotify', true);
    
    // Exchange code via backend (which stores refresh_token in HttpOnly cookie)
    return fetch('/api/spotify/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important for cookies
      body: JSON.stringify({ code })
    })
      .then(response => {
        if (!response.ok) throw new Error('Token exchange failed');
        return response.json();
      })
      .then(data => {
        // Only access_token comes back, refresh_token is in HttpOnly cookie
        setProviderConnected('spotify', data.access_token, data.expires_in);
      })
      .catch(error => {
        setProviderError('spotify', error.message);
        throw error;
      });
  }
  
  logout(): Promise<void> {
    // Also clear the HttpOnly cookie via backend
    return fetch('/api/spotify/logout', {
      method: 'POST',
      credentials: 'include'
    })
      .then(() => {
        setProviderDisconnected('spotify');
      })
      .catch(() => {
        // Still disconnect locally even if backend fails
        setProviderDisconnected('spotify');
      });
  }
  
  private request<T>(endpoint: string): Promise<T> {
    const token = this.accessToken;
    if (!token) return Promise.reject(new Error('Not authenticated'));
    
    return fetch(`${SPOTIFY_API_URL}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(response => {
        if (response.status === 401) {
          // Token expired - refresh via backend (uses HttpOnly cookie)
          return this.refreshAccessToken().then(() => this.request<T>(endpoint));
        }
        if (!response.ok) throw new Error(`Spotify API error: ${response.status}`);
        return response.json() as Promise<T>;
      });
  }
  
  private refreshAccessToken(): Promise<void> {
    // Backend reads refresh_token from HttpOnly cookie
    return fetch('/api/spotify/refresh', {
      method: 'POST',
      credentials: 'include' // Send cookies
    })
      .then(response => {
        if (!response.ok) {
          // Refresh failed - user needs to re-authenticate
          setProviderDisconnected('spotify');
          throw new Error('Session expired, please reconnect');
        }
        return response.json();
      })
      .then(data => {
        setProviderConnected('spotify', data.access_token, data.expires_in);
      });
  }
  
  getPlaylists(): Promise<MusicPlaylist[]> {
    return this.request<SpotifyPlaylistsResponse>('/me/playlists')
      .then(data => data.items.map(p => ({
        id: p.id,
        provider: 'spotify' as const,
        name: p.name,
        description: p.description || undefined,
        artwork: p.images[0]?.url,
        trackCount: p.tracks.total,
        owner: p.owner.display_name || p.owner.id,
        isPublic: p.public || false
      })));
  }
  
  getPlaylistTracks(playlistId: string): Promise<MusicTrack[]> {
    return this.request<SpotifyPlaylistTracksResponse>(`/playlists/${playlistId}/tracks`)
      .then(data => data.items
        .filter(item => item.track && item.track.type === 'track')
        .map(item => this.mapTrack(item.track as SpotifyTrack)));
  }
  
  getFavorites(): Promise<MusicTrack[]> {
    return this.request<SpotifySavedTracksResponse>('/me/tracks?limit=50')
      .then(data => data.items.map(item => this.mapTrack(item.track)));
  }
  
  getRecentlyPlayed(): Promise<MusicTrack[]> {
    return this.request<SpotifyRecentlyPlayedResponse>('/me/player/recently-played?limit=50')
      .then(data => data.items.map(item => this.mapTrack(item.track)));
  }
  
  search(query: string): Promise<MusicTrack[]> {
    return this.request<SpotifySearchResponse>(`/search?q=${encodeURIComponent(query)}&type=track&limit=20`)
      .then(data => (data.tracks?.items || []).map(t => this.mapTrack(t)));
  }
  
  getStreamUrl(track: MusicTrack): Promise<string> {
    // Match to YouTube for full playback
    const searchQuery = `${track.artist} ${track.title}`;
    return fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`)
      .then(response => response.json())
      .then(data => data.videoId || track.previewUrl || '');
  }
  
  private mapTrack(track: SpotifyTrack): MusicTrack {
    return {
      id: track.id,
      provider: 'spotify',
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      duration: Math.floor(track.duration_ms / 1000),
      artwork: track.album.images[0]?.url,
      previewUrl: track.preview_url || undefined,
      externalUrl: track.external_urls.spotify
    };
  }
}

// Spotify API Response Types
interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  preview_url: string | null;
  type: string;
  artists: Array<{ name: string }>;
  album: { name: string; images: Array<{ url: string }> };
  external_urls: { spotify: string };
}

interface SpotifyPlaylistsResponse {
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    public: boolean | null;
    images: Array<{ url: string }>;
    tracks: { total: number };
    owner: { id: string; display_name: string | null };
  }>;
}

interface SpotifyPlaylistTracksResponse {
  items: Array<{ track: SpotifyTrack | null }>;
}

interface SpotifySavedTracksResponse {
  items: Array<{ track: SpotifyTrack }>;
}

interface SpotifyRecentlyPlayedResponse {
  items: Array<{ track: SpotifyTrack }>;
}

interface SpotifySearchResponse {
  tracks?: { items: SpotifyTrack[] };
}

export const spotifyProvider = new SpotifyProvider();
