/**
 * Provider State Store
 * Reactive SolidJS store for music provider connection states
 * This ensures UI updates when provider state changes
 */

import { createStore } from 'solid-js/store';

export interface ProviderConnectionState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  expiresAt: number | null; // Access token expiry timestamp
}

export interface ProviderStoreState {
  spotify: ProviderConnectionState;
  deezer: ProviderConnectionState;
  soundcloud: ProviderConnectionState;
}

const initialProviderState: ProviderConnectionState = {
  isConnected: false,
  isLoading: false,
  error: null,
  expiresAt: null,
};

// Initialize state from localStorage access tokens (not refresh tokens)
const initializeFromStorage = (): ProviderStoreState => ({
  spotify: {
    ...initialProviderState,
    isConnected: !!localStorage.getItem('spotify_access_token'),
  },
  deezer: {
    ...initialProviderState,
    isConnected: !!localStorage.getItem('deezer_access_token'),
  },
  soundcloud: {
    ...initialProviderState,
    isConnected: !!localStorage.getItem('soundcloud_access_token'),
  },
});

export const [providerState, setProviderState] = createStore<ProviderStoreState>(
  initializeFromStorage()
);

// Helper functions for state updates
export function setProviderLoading(provider: keyof ProviderStoreState, loading: boolean): void {
  setProviderState(provider, 'isLoading', loading);
}

export function setProviderConnected(
  provider: keyof ProviderStoreState, 
  accessToken: string,
  expiresIn?: number
): void {
  localStorage.setItem(`${provider}_access_token`, accessToken);
  setProviderState(provider, {
    isConnected: true,
    isLoading: false,
    error: null,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
  });
}

export function setProviderDisconnected(provider: keyof ProviderStoreState): void {
  localStorage.removeItem(`${provider}_access_token`);
  setProviderState(provider, {
    isConnected: false,
    isLoading: false,
    error: null,
    expiresAt: null,
  });
}

export function setProviderError(provider: keyof ProviderStoreState, error: string): void {
  setProviderState(provider, {
    isLoading: false,
    error,
  });
}

// Check if any provider is connected
export function hasAnyProviderConnected(): boolean {
  return providerState.spotify.isConnected || 
         providerState.deezer.isConnected || 
         providerState.soundcloud.isConnected;
}
