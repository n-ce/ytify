import './stylesheets/global.css';
import './scripts/router';
import { render } from 'solid-js/web';
import { actionsMenu } from './lib/dom';

addEventListener('DOMContentLoaded', async () => {
  const settingsContainer = document.getElementById('settings') as HTMLDivElement;

  await import('./components/Settings')
    .then(mod => render(mod.default, settingsContainer));
  settingsContainer.appendChild(document.getElementById('actionsContainer')!);

  await import('./modules/start')
    .then(mod => mod.default());

  await import('./components/ActionsMenu')
    .then(mod => render(mod.default, actionsMenu));

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



