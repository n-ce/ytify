import '../stylesheets/global.css';
import { render } from 'solid-js/web';
import Settings from "../components/Settings";
import './router';
import './theme';
import './search';
import './superModal';
import './queue';
import './list';
import './library';
import './audioEvents';
import './miniPlayer';


if (import.meta.env.PROD)
  import('eruda').then(eruda => eruda.default.init());

if (import.meta.env.PROD)
  import('virtual:pwa-register').then(pwa => {
    const handleUpdate = pwa.registerSW({
      onNeedRefresh() {
        import('../components/UpdatePrompt').then(mod =>
          render(() => mod.default(handleUpdate),
            document.body
          ));
      }
    });
  });


const frag = document.createDocumentFragment();
render(Settings, frag);

document.getElementById('settings')!.prepend(frag);

