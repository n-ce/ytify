//Progressive Web App
const staticLoader = "YTIFY"
const assets = [
  "../Assets/maskable_icon_x192.png",
  "../Assets/maskable_icon_x512.png"
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
      .register("Scripts/service-worker.js")
      .then(res => console.log("service worker registered"))
      .catch(err => console.log("service worker not registered", err))
  })
}
