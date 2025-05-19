import './stylesheets/global.css';
import './scripts/i18n';
import './scripts/router';
import './scripts/audioEvents';
import './scripts/list';
import './scripts/search';
import './scripts/library';
import { render } from 'solid-js/web';

addEventListener('DOMContentLoaded', async () => {

  const settingsContainer = document.getElementById('settings') as HTMLDivElement;
  const stngs = await import('./components/Settings');
  render(stngs.default, settingsContainer);
  settingsContainer.appendChild(document.getElementById('actionsContainer')!);

  (await import('./modules/start')).default();

  (await import('./components/SuperCollectionList')).default();

  if (import.meta.env.PROD)
    await import('virtual:pwa-register').then(pwa => {
      const handleUpdate = pwa.registerSW({
        onNeedRefresh() {
          const dialog = document.createElement('dialog') as HTMLDialogElement;
          dialog.addEventListener('click', (e) => {
            const elm = e.target as HTMLButtonElement;
            if (elm.id === 'updateBtn' || elm.closest('#updateBtn'))
              handleUpdate();
            if (elm.id === 'laterBtn' || elm.closest('#laterBtn')) {
              dialog.close();
              dialog.remove();
            }
          })

          import('./components/UpdatePrompt')
            .then(mod => mod.default(dialog))
            .then(() => document.body.appendChild(dialog));
        }
      });
    });

})
