import './style.css'
document.body.addEventListener('click', () => {
  if (!confirm('clear pwa cache ?'))
    return;
  self.caches.keys().then(s => { s.forEach(k => { self.caches.delete(k) }) });
  navigator.serviceWorker.getRegistrations().then(s => { s.forEach(r => { r.unregister() }) });
  location.reload();
});