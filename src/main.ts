import './stylesheets/global.css';
import './scripts/i18n';
import './scripts/router';
import './scripts/audioEvents';
import './scripts/list';
import './scripts/search';
import './scripts/library';
import { render } from 'solid-js/web';
import { actionsMenu, superCollectionList } from './lib/dom';

addEventListener('DOMContentLoaded', async () => {

  const settingsContainer = document.getElementById('settings') as HTMLDivElement;
  const stngs = await import('./components/Settings');
  render(stngs.default, settingsContainer);
  settingsContainer.appendChild(document.getElementById('actionsContainer')!);

  const start = await import('./modules/start')
  start.default();

  const amenu = await import('./components/ActionsMenu');
  render(amenu.default, actionsMenu);

  const sclist = await import('./components/SuperCollectionList.tsx');
  render(sclist.default, superCollectionList);

  if (import.meta.env.PROD)
    await import('virtual:pwa-register').then(pwa => {
      const handleUpdate = pwa.registerSW({
        onNeedRefresh() {
          import('./components/UpdatePrompt').then(mod =>
            render(() => mod.default(handleUpdate),
              document.body
            ));
        }
      });
    });

})
