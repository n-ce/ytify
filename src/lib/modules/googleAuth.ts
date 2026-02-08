// Google OAuth Module for Cloud Sync
// Uses Google Identity Services (GIS)

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: TokenClientConfig) => TokenClient;
          revoke: (token: string, callback: () => void) => void;
        };
      };
    };
  }
}

interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: TokenResponse) => void;
}

interface TokenClient {
  requestAccessToken: () => void;
}

interface TokenResponse {
  access_token?: string;
  error?: string;
}

export interface GoogleUser {
  email: string;
  sub: string;
  name: string;
  picture: string;
}

// Promise cache to prevent race conditions
let gisLoadPromise: Promise<void> | null = null;

/**
 * Load Google Identity Services script
 * Uses promise caching to prevent race conditions with concurrent calls
 */
export async function loadGoogleIdentityServices(): Promise<void> {
  // Already loaded
  if (window.google?.accounts) {
    return;
  }

  // Loading in progress - return existing promise
  if (gisLoadPromise) {
    return gisLoadPromise;
  }

  // Start loading
  gisLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Reset promise on error to allow retry
      gisLoadPromise = null;
      reject(new Error('Failed to load Google Identity Services'));
    };
    document.head.appendChild(script);
  });

  return gisLoadPromise;
}

/**
 * Sign in with Google and get user info + hash for sync
 */
export async function signInWithGoogle(): Promise<{ hash: string; user: GoogleUser }> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error('Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID in .env');
  }

  await loadGoogleIdentityServices();

  if (!window.google?.accounts) {
    throw new Error('Google Identity Services not available');
  }

  return new Promise((resolve, reject) => {
    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'email profile',
      callback: async (response: TokenResponse) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }

        if (!response.access_token) {
          reject(new Error('No access token received'));
          return;
        }

        try {
          // Fetch user info from Google
          const userInfoResponse = await fetch(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            {
              headers: { Authorization: `Bearer ${response.access_token}` }
            }
          );

          if (!userInfoResponse.ok) {
            throw new Error('Failed to fetch user info');
          }

          const user: GoogleUser = await userInfoResponse.json();

          // Create consistent hash from Google sub (user ID) + email
          const hash = await createSyncHash(user.sub, user.email);

          // Store token for potential sign-out
          localStorage.setItem('google_token', response.access_token);

          resolve({ hash, user });
        } catch (error) {
          reject(error);
        }
      }
    });

    tokenClient.requestAccessToken();
  });
}

/**
 * Create SHA-256 hash for cloud sync identifier
 */
async function createSyncHash(sub: string, email: string): Promise<string> {
  const combinedString = `google:${sub}:${email}`;
  const msgBuffer = new TextEncoder().encode(combinedString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Sign out from Google
 */
export function signOutGoogle(): void {
  const token = localStorage.getItem('google_token');
  if (token && window.google?.accounts) {
    window.google.accounts.oauth2.revoke(token, () => {
      localStorage.removeItem('google_token');
      localStorage.removeItem('sync_email');
      localStorage.removeItem('sync_provider');
    });
  } else {
    localStorage.removeItem('google_token');
    localStorage.removeItem('sync_email');
    localStorage.removeItem('sync_provider');
  }
}

/**
 * Check if user is signed in with Google
 */
export function isGoogleSignedIn(): boolean {
  return localStorage.getItem('sync_provider') === 'google' &&
         !!localStorage.getItem('google_token');
}
