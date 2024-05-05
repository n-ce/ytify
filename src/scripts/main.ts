import '../stylesheets/style.css';
import './api';
import './router';
import './theme';
import './search';
import './superModal';
import './queue';
import './list';
import './settings';
import './library';
import './audioEvents';
import '../components/streamItem';
import '../components/listItem';
import '../components/toggleSwitch';

if (import.meta.env.PROD)
  import('virtual:pwa-register').then(pwa => {

    const handleUpdate = pwa.registerSW({
      async onNeedRefresh() {
        import('../components/UpdatePrompt').then(mod =>
          import('solid-js/web').then(solid => solid.render(
            () => mod.default(handleUpdate),
            document.body
          )));
      }
    });
  });
