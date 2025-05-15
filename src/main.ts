import './stylesheets/global.css';
import './scripts/i18n';
import './scripts/router';
import './scripts/audioEvents';
import './scripts/list';
import './scripts/search';
import './scripts/library';
import { render } from 'solid-js/web';
import { render as uhtml } from 'uhtml';
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
          const dialog = document.createElement('dialog') as HTMLDialogElement;
          dialog.id = 'changelog';
          dialog.open = true;
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
            .then(async mod => uhtml(dialog, await mod.default()))
            .then(() => document.body.appendChild(dialog));
        }
      });
    });

})
