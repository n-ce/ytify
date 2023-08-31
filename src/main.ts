import './style.css'
import './nav.css'

document.body.addEventListener('click', (e) => {
  if (!e.target?.matches('body'))
    return;
  if (!confirm('clear pwa cache ?'))
    return;
  self.caches.keys().then(s => { s.forEach(k => { self.caches.delete(k) }) });
  navigator.serviceWorker.getRegistrations().then(s => { s.forEach(r => { r.unregister() }) });
  location.reload();
});