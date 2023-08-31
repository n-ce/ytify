import './style.css'
import './nav.css'

document.getElementsByTagName('section')[4].addEventListener('click', () => {
  if (confirm('clear pwa cache ?')) {
    self.caches.keys().then(s => { s.forEach(k => { self.caches.delete(k) }) });
    navigator.serviceWorker.getRegistrations().then(s => { s.forEach(r => { r.unregister() }) });
    location.reload();
  }
});