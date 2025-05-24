import './stylesheets/global.css';
import './scripts/i18n';
import './scripts/router';
import './scripts/audioEvents';
import './scripts/list';
import './scripts/search';
import './scripts/theme';

addEventListener('DOMContentLoaded', async () => {


  (await import('./modules/start')).default();

  (await import('./components/SuperCollectionList')).default();


  const settingsHandler = document.getElementById('settingsHandler') as HTMLLIElement;
  settingsHandler.addEventListener('click', async () => {
    (await import('./components/Settings/index')).default();
  });

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
