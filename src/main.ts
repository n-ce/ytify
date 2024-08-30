import './stylesheets/global.css';
import './components/Settings';

import './scripts/theme';
import './scripts/queue';
import './scripts/audioEvents';
import './scripts/library';

addEventListener('DOMContentLoaded', async () => {
  import('./scripts/router');

  import('./scripts/search');

  import('./scripts/list');

  import('./scripts/miniPlayer');

  import('./scripts/start').then(mod => mod.default());
});
