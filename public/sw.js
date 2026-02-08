/**
 * ============================================================================
 * YTFY Service Worker Stub
 * ============================================================================
 * This file is a placeholder that will be replaced during the build process
 * by the compiled service worker from src/lib/workers/service-worker.ts
 * 
 * During development, this basic stub provides minimal offline support.
 * ============================================================================
 */

const CACHE_NAME = 'ytfy-dev-v1';
const OFFLINE_URL = '/index.html';

// Install event - cache basic offline page
self.addEventListener('install', (event) => {
  console.log('[SW Stub] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/404.html',
        '/logo192.png',
        '/ytify_lite.svg',
      ]);
    })
  );
  
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW Stub] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  
  self.clients.claim();
});

// Fetch event - basic cache-first for static, network-first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Network-first for API endpoints
  if (url.pathname.startsWith('/api/') || 
      url.pathname.startsWith('/sync/') || 
      url.pathname.startsWith('/library/')) {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(request))
    );
    return;
  }
  
  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200) {
          return response;
        }
        
        // Clone and cache the response
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        
        return response;
      }).catch(() => {
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Message handling
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW Stub] Service worker stub loaded. Replace with production build.');
