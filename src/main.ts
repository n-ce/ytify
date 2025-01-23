import './stylesheets/global.css';
import './scripts/router';
import './scripts/audioEvents';
import './scripts/list';
import './scripts/search';
import './scripts/library';
import { render } from 'solid-js/web';
import { actionsMenu } from './lib/dom';
import {translateHTML} from "./scripts/translateHTML.ts";
import {i18n} from "@lingui/core";
import {callChangeLanguage} from "./components/Settings.tsx";

addEventListener('DOMContentLoaded', async () => {

  const savedLanguage = localStorage.getItem("language") || "en";
  const languageSelector = document.getElementById("language") as HTMLSelectElement;

  i18n.activate(savedLanguage);

  translateHTML();

  if (languageSelector) {
    languageSelector.value = savedLanguage;
  }

  languageSelector?.addEventListener("change", callChangeLanguage);

  const settingsContainer = document.getElementById('settings') as HTMLDivElement;
  const stngs = await import('./components/Settings');
  render(stngs.default, settingsContainer);
  settingsContainer.appendChild(document.getElementById('actionsContainer')!);

  const start = await import('./modules/start')
  start.default();

  const amenu = await import('./components/ActionsMenu');
  render(amenu.default, actionsMenu);

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

