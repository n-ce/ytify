import './stylesheets/global.css';
import './scripts/router';
import './scripts/theme';
import './scripts/search';
import './scripts/queue';
import './scripts/list';
import './scripts/audioEvents';
import './scripts/library';
import './scripts/miniPlayer';
import './components/Settings';

addEventListener('DOMContentLoaded', async () => {
  import('./scripts/start').then(mod => mod.default());
});
