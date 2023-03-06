//Progressive Web App
const staticLoader = "ytify"
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

self.addEventListener("install", installEvent => {
  installEvent.waitUntil(
    caches.open(staticLoader).then(cache => {
      cache.addAll(assets)
    })
  )
})
self.addEventListener("fetch", fetchEvent => {
  fetchEvent.respondWith(
    caches.match(fetchEvent.request).then(res => {
      return res || fetch(fetchEvent.request)
    })
  )
})

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker
      .register("./Scripts/service-worker.js")
      .then(res => console.log(res))
      .catch(err => console.log("service worker not registered", err))
  })
}