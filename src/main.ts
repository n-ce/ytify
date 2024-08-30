import './stylesheets/global.css';

addEventListener('DOMContentLoaded', async () => {
  import('./scripts/start').then(mod => mod.default());
});
