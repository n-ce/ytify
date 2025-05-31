import { html } from 'uhtml';
import ToggleSwitch from './ToggleSwitch';
import { i18n } from '../../scripts/i18n';
import { setState, state } from '../../lib/store';

let parts: {
  name: string,
  callback: (arg0: Event & { target: HTMLElement }) => void
}[] = [];

(async () => {
  if (state.partsManagerPIN) {
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
    checked: Boolean(state.partsManagerPIN),
    handler: e => {
      const { partsManagerPIN } = state;
      if (partsManagerPIN) {
        if (prompt('Enter PIN to disable parental controls :') === partsManagerPIN) {
          for (const key in state)
            if (key.startsWith('part '))
              setState(key as keyof typeof state, false);
          setState('partsManagerPIN', '');
          location.reload();
        } else {
          alert(i18n('settings_pin_incorrect'));
          e.preventDefault();
        }
        return;
      }
      const pin = prompt(i18n('settings_pin_message'));
      if (pin) {
        setState('partsManagerPIN', pin);
        location.reload();
      }
      else e.preventDefault();
    }
  })}

      ${parts.map(item => html`
          ${ToggleSwitch({
    id: 'kidsMode_' + item.name,
    name: item.name as TranslationKeys,
    checked: !state[('part ' + item.name) as keyof typeof state],
    handler: item.callback
  })}
        `)
    }
    </div>
  `;
}
