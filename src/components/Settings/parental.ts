import { html } from 'uhtml';
import ToggleSwitch from './ToggleSwitch';
import { i18n } from '../../scripts/i18n';
import { setState, state } from '../../lib/store';
import { notify } from '../../lib/utils';


export default async function() {
  const parts = state.partsManagerPIN ? (await import('../../modules/partsManager')).default() : [];

  const template = () => parts.map(item => html`
          ${ToggleSwitch({
    id: 'part ' + item.name,
    name: item.name as TranslationKeys,
    checked: state[('part ' + item.name) as keyof typeof state] as boolean,
    handler: item.callback
  })}`)

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
              setState(key as keyof typeof state, true);
          setState('partsManagerPIN', '');
          notify(i18n('settings_reload'));
        } else {
          alert(i18n('settings_pin_incorrect'));
          e.preventDefault();
        }
        return;
      }
      const pin = prompt(i18n('settings_pin_message'));
      if (pin) {
        setState('partsManagerPIN', pin);
        notify(i18n('settings_reload'));
      }
      else e.preventDefault();
    }
  })}

      ${template()}
    </div>
  `;
}
