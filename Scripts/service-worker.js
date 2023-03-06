const assets = [
  "/",
  "/Stylesheets/main.css",
  "/Stylesheets/player.css",
  "/Stylesheets/data.css",
  "/Stylesheets/settings.css",
  "Scripts/main.js",
  "Scripts/buttons.js",
  "Scripts/constants.js"
]

self.addEventListener("install",
  installEvent =>
  installEvent.waitUntil(
    caches
    .open("ytify")
    .then(cache => cache.addAll(assets))
  )
)
self.addEventListener("fetch",
  fetchEvent =>
  fetchEvent.respondWith(
    caches
    .match(fetchEvent.request)
    .then(res => res || fetch(fetchEvent.request))
  )
)

if ("serviceWorker" in navigator)
  window.addEventListener("load",
    () =>
    navigator.serviceWorker.register("./Scripts/service-worker.js")
  )