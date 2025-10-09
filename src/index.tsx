/* @refresh reload */

import { render } from 'solid-js/web';
import { updateLang } from './lib/stores/i18n';
import App from './features';
import { config, themer } from './lib/utils';
import { createSignal, lazy } from 'solid-js';




updateLang().then(() => {
  themer();

  const [isOnline, setOnline] = createSignal(!config.dbsync);
  if (config.dbsync) {
    addEventListener('online', () => {
      setOnline(true);
    });

    addEventListener('offline', () => {
      setOnline(false);
    });
  }

  const OfflineView = lazy(() => import('@components/OfflineView'));

  render(() => isOnline() ? <App /> : <OfflineView />, document.body);
});


