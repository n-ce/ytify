const cacheName = '5.13.3';
const contentToCache = [
    "/",
    "/src/stylesheets/main.css",
    "/src/stylesheets/data.css",
    "/src/stylesheets/player.css",
    "/src/stylesheets/relatedStreams.css",
    "/src/stylesheets/settingsContainer.css",
    "/src/scripts/buttons.js",
    "/src/scripts/player.js",
    "/src/scripts/lib/helperFunctions.js",
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

// Installing Service Worker
self.addEventListener('install', (e) => {
	console.log('[Service Worker] Install');
	e.waitUntil((async () => {
		const cache = await caches.open(cacheName);
		console.log('[Service Worker] Caching all: app shell and content');
		await cache.addAll(contentToCache);
	})());
});

// Fetching content using Service Worker
self.addEventListener('fetch', (e) => {
	if (!(
			e.request.url.startsWith('http:') || e.request.url.startsWith('https:')
		)) {
		return;
	}

	e.respondWith((async () => {
		const r = await caches.match(e.request);
		console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
		if (r) return r;
		const response = await fetch(e.request);
		const cache = await caches.open(cacheName);
		console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
		cache.put(e.request, response.clone());
		return response;
	})());
});

