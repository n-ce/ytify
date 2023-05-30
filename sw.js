const version = '5.14.6';
const contentToCache = [
    "/",
    "/src/stylesheets/main.css",
    "/src/stylesheets/data.css",
    "/src/stylesheets/player.css",
    "/src/stylesheets/containers.css",
    "/src/scripts/buttons.js",
    "/src/scripts/player.js",
    "/src/scripts/lib/utils.js",
    "/src/scripts/lib/sax.min.js",
    "/src/scripts/lib/imsc.min.js",
    "/src/components/ListItem.js",
    "/src/components/ToggleSwitch.js",
    "/assets/ytify_thumbnail_min.webp",
    "/assets/maskable_icon_x192.png",
    "/assets/maskable_icon_x512.png",
    "/assets/NotoSans.woff2",
    "/assets/remixicon.woff2"
    ];



// Install the service worker and cache the assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(version)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(contentToCache);
      })
  );
});

// Fetch the assets from the cache or the network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Network fetch - update the cache with the new response
        return fetch(event.request).then(
          response => {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            // Clone the response to use it in cache and browser
            const responseToCache = response.clone();
            caches.open(version)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          }
        );
      })
  );
});

// Activate the service worker and delete old caches
self.addEventListener('activate', event => {
  const expectedCacheNames = [version];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (expectedCacheNames.indexOf(cacheName) === -1) {
            // Delete old cache
            console.log('Deleting out of date cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});