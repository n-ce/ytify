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
import { registerSW } from 'virtual:pwa-register';

const updater = <HTMLElement & { handleUpdate(): {} }>document.createElement('update-prompt');

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

