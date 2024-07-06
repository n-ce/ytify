import './stylesheets/global.css';
import './scripts/router';
import './scripts/theme';
import './scripts/api';
import './scripts/search';
import './scripts/superModal';
import './scripts/queue';
import './scripts/list';
import './scripts/audioEvents';
import './scripts/miniPlayer';
import './scripts/library';
import { instanceSelector } from './lib/dom';
import { render } from 'solid-js/web';
import Settings from "./components/Settings";

if (import.meta.env.PROD)

  import('virtual:pwa-register').then(pwa => {
    const handleUpdate = pwa.registerSW({
      onNeedRefresh() {
        import('./components/UpdatePrompt').then(mod =>
          render(() => mod.default(handleUpdate),
            document.body
          ));
      }
    });
  });


/*
instance selector is a vital part of the web app which should be available as quickly as possible to all the parts of the app, this is only possible through html, below are measures taken to extract the html area after it has been connected and retrofit it into the jsx component loaded later
*/

const settingsContainer = document.getElementById('settings') as HTMLDivElement;

render(Settings, settingsContainer);

// render appends Settings after act so we append act after Settings
settingsContainer.appendChild(document.getElementById('actionsContainer')!);
// insert the instance selector inside the component area
document.getElementById('instanceSelectorContainer')!.appendChild(instanceSelector);
