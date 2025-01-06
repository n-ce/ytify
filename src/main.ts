import './stylesheets/global.css';
import './scripts/router';
import './scripts/audioEvents';
import './scripts/list';
import './scripts/search';
import './scripts/library';
import { render } from 'solid-js/web';
import { actionsMenu } from './lib/dom';

addEventListener('DOMContentLoaded', async () => {
  const settingsContainer = document.getElementById('settings') as HTMLDivElement;
  const stngs = await import('./components/Settings');
  const start = await import('./modules/start')
  const amenu = await import('./components/ActionsMenu');

  start.default();
  render(amenu.default, actionsMenu);
  render(stngs.default, settingsContainer);

  settingsContainer.appendChild(document.getElementById('actionsContainer')!);

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

