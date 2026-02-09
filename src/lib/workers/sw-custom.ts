/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute, Route } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { RangeRequestsPlugin } from 'workbox-range-requests';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope;

// Clean up old caches
cleanupOutdatedCaches();

// Precache static assets from build
precacheAndRoute(self.__WB_MANIFEST);

// =============================================================================
// 🎵 AUDIO STREAMING CACHE - Critical for offline playback
// =============================================================================
const audioRoute = new Route(
  ({ url }) => {
    // Match YouTube audio streams (googlevideo.com)
    if (url.hostname.includes('googlevideo.com')) return true;
    // Match JioSaavn CDN
    if (url.hostname.includes('saavncdn.com')) return true;
    // Match SoundCloud CDN
    if (url.hostname.includes('sndcdn.com')) return true;
    // Match any path containing /audio/
    if (url.pathname.includes('/audio/')) return true;
    return false;
  },
  new CacheFirst({
    cacheName: 'audio-cache-v1',
    plugins: [
      // Cache successful responses and partial content (206)
      new CacheableResponsePlugin({ statuses: [200, 206] }),
      // Critical for audio seeking - handles Range requests
      new RangeRequestsPlugin(),
      // Limit cache size
      new ExpirationPlugin({
        maxEntries: 100, // ~100 songs cached
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        purgeOnQuotaError: true, // Auto-clear when quota exceeded
      }),
    ],
  })
);
registerRoute(audioRoute);

// =============================================================================
// 🖼️ IMAGE CACHE - Album art, artist photos, thumbnails
// =============================================================================
const imageRoute = new Route(
  ({ request, url }) => {
    // Match image requests
    if (request.destination === 'image') return true;
    // Match YouTube thumbnails
    if (url.hostname.includes('ytimg.com')) return true;
    if (url.hostname.includes('ggpht.com')) return true;
    // Match i.scdn.co (Spotify images)
    if (url.hostname.includes('scdn.co')) return true;
    return false;
  },
  new CacheFirst({
    cacheName: 'images-cache-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);
registerRoute(imageRoute);

// =============================================================================
// 📚 LIBRARY DATA - Playlists, history, favorites (sync endpoints)
// =============================================================================
const libraryRoute = new Route(
  ({ url }) => {
    return url.pathname.startsWith('/library/') || 
           url.pathname.startsWith('/sync/');
  },
  new NetworkFirst({
    cacheName: 'library-cache-v1',
    networkTimeoutSeconds: 3, // Fallback to cache after 3s
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxAgeSeconds: 24 * 60 * 60 }), // 1 day
    ],
  })
);
registerRoute(libraryRoute);

// =============================================================================
// 🔄 BACKGROUND SYNC - For offline library modifications
// =============================================================================
const bgSyncPlugin = new BackgroundSyncPlugin('library-sync-queue', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
        console.log('[SW] Background sync successful for:', entry.request.url);
      } catch (error) {
        console.error('[SW] Background sync failed:', error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  },
});

// Sync POST/PUT requests that failed offline
registerRoute(
  ({ url, request }) => {
    return (url.pathname.startsWith('/sync/') || url.pathname.startsWith('/library/')) &&
           (request.method === 'POST' || request.method === 'PUT');
  },
  new NetworkFirst({
    plugins: [bgSyncPlugin],
  }),
  'POST'
);

registerRoute(
  ({ url, request }) => {
    return (url.pathname.startsWith('/sync/') || url.pathname.startsWith('/library/')) &&
           request.method === 'PUT';
  },
  new NetworkFirst({
    plugins: [bgSyncPlugin],
  }),
  'PUT'
);

// =============================================================================
// 🎯 API RESPONSES - Search results, video info (stale-while-revalidate)
// =============================================================================
const apiRoute = new Route(
  ({ url }) => {
    return url.pathname.startsWith('/api/') ||
           url.hostname.includes('invidious') ||
           url.pathname.includes('/api/v1/videos/');
  },
  new StaleWhileRevalidate({
    cacheName: 'api-cache-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60, // 1 hour
      }),
    ],
  })
);
registerRoute(apiRoute);

// =============================================================================
// 📄 NAVIGATION - SPA fallback to index.html
// =============================================================================
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'navigation-cache-v1',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  }),
  {
    // Don't cache OAuth callback pages
    denylist: [/\/callback\//],
  }
);
registerRoute(navigationRoute);

// =============================================================================
// 🔔 SERVICE WORKER LIFECYCLE
// =============================================================================
self.addEventListener('install', (_event) => {
  console.log('[SW] Service Worker installing...');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating...');
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Clear specific caches on demand
  if (event.data && event.data.type === 'CLEAR_AUDIO_CACHE') {
    caches.delete('audio-cache-v1').then(() => {
      console.log('[SW] Audio cache cleared');
    });
  }
});

// Log cache storage usage
self.addEventListener('activate', async () => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const percentUsed = ((estimate.usage || 0) / (estimate.quota || 1) * 100).toFixed(2);
    console.log(`[SW] Storage: ${percentUsed}% used (${Math.round((estimate.usage || 0) / 1024 / 1024)}MB of ${Math.round((estimate.quota || 0) / 1024 / 1024)}MB)`);
  }
});
