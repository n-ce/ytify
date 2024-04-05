// import in order of site usage to minimize loading time
import '../stylesheets/style.css';
import './api';
import './router';
import './theme';
import './search';
import './audioEvents';
import './library';
import './superModal';
import './queue';
import './settings';
import './list';
import '../components/streamItem';
import '../components/listItem';
import '../components/toggleSwitch';

if (import.meta.env.DEV)
  import('eruda').then(eruda => eruda.default.init());

if (import.meta.env.PROD)
  import('virtual:pwa-register').then(pwa => {
    const updater = document.createElement('update-prompt') as HTMLElement & { handleUpdate(): void };

    updater.handleUpdate = pwa.registerSW({
      async onNeedRefresh() {
        const { html, render } = await import('lit');
        import('../components/updatePrompt').then(() => render(
          html`<dialog id='changelog' open>
      ${updater}</dialog>`,
          document.body
        ));
      }
    });
  });
