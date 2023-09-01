import './style.css';
import './footer.css';
import './nav.css';
import nav from './nav';
nav();

// for pwa emergency cache removal
document.getElementById('settings')?.addEventListener('click', () => {
  if (confirm('clear pwa cache ?')) {
    self.caches.keys().then(s => { s.forEach(k => { self.caches.delete(k) }) });
    navigator.serviceWorker.getRegistrations().then(s => { s.forEach(r => { r.unregister() }) });
    location.reload();
  }
});

// testing query params with hash based routing
const params = (new URL(
  location.href)).searchParams;

console.log(params.get('s'))
document.getElementById('related-streams')?.addEventListener('click', () => {
  params.set('s', 'id');
  history.pushState({}, '', '?' + params);
})