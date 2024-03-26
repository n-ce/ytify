// import in order of site usage to minimize loading time
if (import.meta.env.DEV)
  await import('eruda').then(eruda => eruda.default.init());

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
import { registerSW } from 'virtual:pwa-register';

const updater = document.createElement('update-prompt') as HTMLElement & { handleUpdate(): void };

updater.handleUpdate = registerSW({
  async onNeedRefresh() {
    const { html, render } = await import('lit');
    import('../components/updatePrompt').then(() => render(
      html`<dialog id='changelog' open>
      ${updater}</dialog>`,
      document.body
    ));
  }
});

