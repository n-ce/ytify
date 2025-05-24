import { html } from 'uhtml';
import ToggleSwitch from './ToggleSwitch';
import { i18n } from '../../scripts/i18n';
import { removeSaved, save } from '../../lib/utils';
import { getSaved } from '../../lib/store';

let parts: {
  name: string,
  callback: (arg0: Event) => void
}[] = [];

(async () => {
  if (getSaved('kidsMode')) {
    const pm = await import('../../modules/partsManager');
    parts = pm.default();
  }
})();

export default function() {
  return html`
    <div>
      <b>
        <i class="ri-parent-line"></i>
        <p>${i18n('settings_parental_controls')}</p>
      </b>

      ${ToggleSwitch({
    id: "kidsSwitch",
    name: 'settings_pin_toggle',
    checked: Boolean(getSaved('kidsMode')),
    handler: e => {
      const savedPin = getSaved('kidsMode');
      if (savedPin) {
        if (prompt('Enter PIN to disable parental controls :') === savedPin) {
          const len = localStorage.length;
          for (let i = 0; i <= len; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('kidsMode'))
              removeSaved(key);
          }
          location.reload();
        } else {
          alert(i18n('settings_pin_incorrect'));
          e.preventDefault();
        }
        return;
      }
      const pin = prompt(i18n('settings_pin_message'));
      if (pin) {
        save('kidsMode', pin);
        location.reload();
      }
      else e.preventDefault();
    }
  })}

      ${parts.map(item => html`
          ${ToggleSwitch({
    id: 'kidsMode_' + item.name,
    name: item.name as TranslationKeys,
    checked: !getSaved('kidsMode_' + item.name),
    handler: item.callback
  })}
        `)
    }
    </div>
  `;
}
