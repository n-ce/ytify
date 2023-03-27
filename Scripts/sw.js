const cacheName = 'ytify_5.8.17';
const contentToCache = [
    "./",
    "./index.html",
    "./Stylesheets/main.css",
    "./Stylesheets/player.css",
    "./Stylesheets/data.css",
    "./Scripts/main.js",
    "./Scripts/buttons.js",
    "./Scripts/lib/DOM.js",
    "./Scripts/lib/functions.js",
    "./Assets/Icons/remixicon.css",
    "./Assets/Icons/remixicon.ttf",
    "./Assets/Icons/remixicon.woff",
    "./Assets/Icons/remixicon.woff2",
    "./Assets/NotoSans.woff2",
    "./Assets/ytify_thumbnail_max.webp"
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