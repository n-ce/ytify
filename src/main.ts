import './stylesheets/global.css';
import('eruda')
  .then(mod => mod.default.init())
  .then(() => {
    addEventListener('DOMContentLoaded', async () => {
      import('./scripts/start').then(mod => mod.default());
    });
  });
