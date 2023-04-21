const cacheName = 'ytify_5.10.8';
const contentToCache = [
    "/",
    "/index.html",
    "/stylesheets/main.css",
    "/stylesheets/data.css",
    "/stylesheets/player.css",
    "/stylesheets/relatedStreams.css",
    "/assets/Fonts/remixicon.css",
    "/components/ListItem.js",
    "/scripts/buttons.js",
    "/scripts/player.js",
    "/scripts/lib/DOM.js",
    "/scripts/lib/helperFunctions.js",
    "/scripts/lib/sax.min.js",
    "/scripts/lib/imsc.min.js",
    "/assets/ytify_thumbnail_min.webp"
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

