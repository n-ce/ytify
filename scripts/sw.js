const cacheName = 'ytify_5.9.4';
const contentToCache = [
    "./",
    "./index.html",
    "./stylesheets/main.css",
    "./stylesheets/player.css",
    "./stylesheets/data.css",
    "./stylesheets/relatedStreams.css",
    "https://cdn.jsdelivr.net/npm/sax/lib/sax.min.js",
    "https://unpkg.com/imsc/dist/imsc.min.js",
    "./scripts/player.js",
    "./scripts/buttons.js",
    "./scripts/lib/DOM.js",
    "./scripts/lib/functions.js",
    "./components/ListItem.js",
    "./assets/Fonts/remixicon.css",
    "./assets/Fonts/remixicon.woff2",
    "./assets/Fonts/NotoSans.woff2",
    "./assets/ytify_thumbnail_min.webp"
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
	// Cache http and https only, skip unsupported chrome-extension:// and file://...
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