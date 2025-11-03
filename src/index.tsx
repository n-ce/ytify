/* @refresh reload */

import { render } from 'solid-js/web';
import { updateLang } from './lib/stores/i18n';
import App from './features';
import { config, themer } from './lib/utils';
import { lazy, Show } from 'solid-js';

const SyncWrapper = lazy(() => import('@components/SyncWrapper'));

updateLang().then(() => {
  themer();

  render(() => (
    <Show when={config.dbsync} fallback={<App />}>
      <SyncWrapper>
        <App />
      </SyncWrapper>
    </Show>
  ), document.body);
});


