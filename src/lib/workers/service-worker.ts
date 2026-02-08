/**
 * ============================================================================
 * YTFY Service Worker
 * ============================================================================
 * Purpose: Advanced caching strategies for offline support and performance
 * Strategies: Cache-first for static, Network-first for API, Stale-while-revalidate
 * ============================================================================
 */

/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { RangeRequestsPlugin } from 'workbox-range-requests';

declare const self: ServiceWorkerGlobalScope;

// ==========================================================================
// Configuration
// ==========================================================================

const CONFIG = {
  // Cache names
  CACHE_NAMES: {
    STATIC: 'ytfy-static-v1',
    IMAGES: 'ytfy-images-v1',
    API: 'ytfy-api-v1',
    MEDIA: 'ytfy-media-v1',
    FONTS: 'ytfy-fonts-v1',
    RUNTIME: 'ytfy-runtime-v1',
  },
  
  // Cache limits
  CACHE_LIMITS: {
    STATIC: 100,
    IMAGES: 200,
    API: 50,
    MEDIA: 30,
    FONTS: 20,
  },
  
  // Expiration times (in seconds)
  EXPIRATION: {
    STATIC: 30 * 24 * 60 * 60,     // 30 days
    IMAGES: 7 * 24 * 60 * 60,       // 7 days
    API: 5 * 60,                     // 5 minutes
    MEDIA: 24 * 60 * 60,            // 24 hours
    FONTS: 365 * 24 * 60 * 60,      // 1 year
  },
  
  // API endpoints
  API_ENDPOINTS: [
    '/api/',
    '/sync/',
    '/library/',
    '/hash',
    '/health',
  ],
  
  // Static asset patterns
  STATIC_PATTERNS: [
    /\.(?:js|css)$/,
    /\.(?:woff2?|ttf|eot|otf)$/,
  ],
  
  // Image patterns
  IMAGE_PATTERNS: [
    /\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico)$/,
  ],
  
  // Media patterns
  MEDIA_PATTERNS: [
    /\.(?:mp3|mp4|webm|ogg|opus|m4a|aac|flac|wav)$/,
    /\/stream\//,
  ],
};

// ==========================================================================
// Precaching
// ==========================================================================

// Precache assets from the build manifest
// This is populated by Workbox during the build process
// @ts-ignore - __WB_MANIFEST is injected by Workbox
precacheAndRoute(self.__WB_MANIFEST || []);

// Clean up old caches from previous versions
cleanupOutdatedCaches();

// ==========================================================================
// Navigation Route (SPA Support)
// ==========================================================================

// Handle navigation requests with app shell
const navigationHandler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(navigationHandler, {
  // Exclude API endpoints and static files from navigation
  denylist: [
    /^\/api\//,
    /^\/sync\//,
    /^\/library\//,
    /^\/hash/,
    /^\/s\//,
    /^\/ss\//,
    /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|woff2?|ico|json)$/,
  ],
});
registerRoute(navigationRoute);

// ==========================================================================
// Static Assets - Cache First Strategy
// ==========================================================================

// JavaScript and CSS files
registerRoute(
  ({ request, url }) => {
    return CONFIG.STATIC_PATTERNS.some(pattern => pattern.test(url.pathname)) ||
           request.destination === 'script' ||
           request.destination === 'style';
  },
  new CacheFirst({
    cacheName: CONFIG.CACHE_NAMES.STATIC,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: CONFIG.CACHE_LIMITS.STATIC,
        maxAgeSeconds: CONFIG.EXPIRATION.STATIC,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ==========================================================================
// Fonts - Cache First (Long-term)
// ==========================================================================

registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: CONFIG.CACHE_NAMES.FONTS,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: CONFIG.CACHE_LIMITS.FONTS,
        maxAgeSeconds: CONFIG.EXPIRATION.FONTS,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ==========================================================================
// Images - Cache First with Fallback
// ==========================================================================

registerRoute(
  ({ request, url }) => {
    return request.destination === 'image' ||
           CONFIG.IMAGE_PATTERNS.some(pattern => pattern.test(url.pathname));
  },
  new CacheFirst({
    cacheName: CONFIG.CACHE_NAMES.IMAGES,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: CONFIG.CACHE_LIMITS.IMAGES,
        maxAgeSeconds: CONFIG.EXPIRATION.IMAGES,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ==========================================================================
// API Endpoints - Network First with Cache Fallback
// ==========================================================================

// General API requests
registerRoute(
  ({ url }) => {
    return CONFIG.API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint));
  },
  new NetworkFirst({
    cacheName: CONFIG.CACHE_NAMES.API,
    networkTimeoutSeconds: 10,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: CONFIG.CACHE_LIMITS.API,
        maxAgeSeconds: CONFIG.EXPIRATION.API,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ==========================================================================
// Video/Track API - Stale While Revalidate
// ==========================================================================

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/videos/'),
  new StaleWhileRevalidate({
    cacheName: CONFIG.CACHE_NAMES.API,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 60, // 30 minutes
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ==========================================================================
// Media Streaming - Range Requests Support
// ==========================================================================

registerRoute(
  ({ url }) => {
    return CONFIG.MEDIA_PATTERNS.some(pattern => pattern.test(url.pathname));
  },
  new CacheFirst({
    cacheName: CONFIG.CACHE_NAMES.MEDIA,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200, 206], // Include partial content
      }),
      new RangeRequestsPlugin(),
      new ExpirationPlugin({
        maxEntries: CONFIG.CACHE_LIMITS.MEDIA,
        maxAgeSeconds: CONFIG.EXPIRATION.MEDIA,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ==========================================================================
// External Resources - Stale While Revalidate
// ==========================================================================

// YouTube thumbnails and external images
registerRoute(
  ({ url }) => {
    return url.hostname.includes('ytimg.com') ||
           url.hostname.includes('googleusercontent.com') ||
           url.hostname.includes('ggpht.com');
  },
  new StaleWhileRevalidate({
    cacheName: CONFIG.CACHE_NAMES.IMAGES,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ==========================================================================
// Background Sync for Offline Actions
// ==========================================================================

// Queue for syncing library changes when back online
const libraryBgSyncPlugin = new BackgroundSyncPlugin('library-sync-queue', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
        console.log('[SW] Background sync successful:', entry.request.url);
      } catch (error) {
        console.error('[SW] Background sync failed, re-queueing:', error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  },
});

// Library update endpoint with background sync
registerRoute(
  ({ url, request }) => {
    return url.pathname.match(/^\/library\/[a-f0-9]+$/) &&
           ['POST', 'PUT'].includes(request.method);
  },
  new NetworkOnly({
    plugins: [libraryBgSyncPlugin],
  }),
  'POST'
);

registerRoute(
  ({ url, request }) => {
    return url.pathname.match(/^\/library\/[a-f0-9]+$/) &&
           ['POST', 'PUT'].includes(request.method);
  },
  new NetworkOnly({
    plugins: [libraryBgSyncPlugin],
  }),
  'PUT'
);

// ==========================================================================
// Service Worker Lifecycle Events
// ==========================================================================

// Install event - cache critical resources
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[SW] Installing service worker...');
  
  // Skip waiting to activate immediately
  self.skipWaiting();
  
  // Pre-cache critical resources
  event.waitUntil(
    caches.open(CONFIG.CACHE_NAMES.STATIC).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/404.html',
        '/manifest.webmanifest',
        '/logo192.png',
        '/logo512.png',
        '/ytify_lite.svg',
        '/remixicon.woff2',
      ]);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[SW] Activating service worker...');
  
  // Take control of all pages immediately
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Remove caches not in current config
              return !Object.values(CONFIG.CACHE_NAMES).includes(name);
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
    ])
  );
});

// ==========================================================================
// Message Handling
// ==========================================================================

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (!event.data) return;
  
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((name) => caches.delete(name))
          );
        }).then(() => {
          event.ports[0]?.postMessage({ success: true });
        })
      );
      break;
      
    case 'GET_CACHE_SIZE':
      event.waitUntil(
        getCacheSize().then((size) => {
          event.ports[0]?.postMessage({ size });
        })
      );
      break;
      
    case 'CACHE_URL':
      if (event.data.url) {
        event.waitUntil(
          caches.open(CONFIG.CACHE_NAMES.RUNTIME).then((cache) => {
            return cache.add(event.data.url);
          }).then(() => {
            event.ports[0]?.postMessage({ success: true });
          }).catch((error) => {
            event.ports[0]?.postMessage({ success: false, error: error.message });
          })
        );
      }
      break;
  }
});

// ==========================================================================
// Helper Functions
// ==========================================================================

/**
 * Calculate total cache size
 */
async function getCacheSize(): Promise<number> {
  let totalSize = 0;
  const cacheNames = await caches.keys();
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.clone().blob();
        totalSize += blob.size;
      }
    }
  }
  
  return totalSize;
}

// ==========================================================================
// Offline Fallback
// ==========================================================================

// Handle fetch errors with offline fallback
self.addEventListener('fetch', (event: FetchEvent) => {
  // Only handle navigation requests for offline fallback
  if (event.request.mode !== 'navigate') return;
  
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match('/index.html') || caches.match('/404.html');
    }).then((response) => {
      return response || new Response('Offline', { status: 503 });
    })
  );
});

// ==========================================================================
// Push Notifications (Future)
// ==========================================================================

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'YTFY', {
      body: data.body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: data.tag || 'ytfy-notification',
      data: data.data,
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus existing window or open new one
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

console.log('[SW] Service worker loaded');
