import { For, createSignal, onMount } from 'solid-js';
import ToggleSwitch from './ToggleSwitch.tsx';
import { setState, state } from '../../lib/store.ts';
import { notify, i18n } from '../../lib/utils.ts';

export default function() {
  const [parts, setParts] = createSignal<{
    name: string,
    callback: (arg0: Event & { target: HTMLElement }) => void
  }[]>([]);

  onMount(async () => {
    if (state.partsManagerPIN) {
      const partsModule = await import('../../modules/partsManager.ts');
      setParts(partsModule.default());
    }
  });

  return (
    <div>
      <b>
        <i class="ri-parent-line"></i>
        <p>{i18n('settings_parental_controls')}</p>
      </b>

      <ToggleSwitch
        id="kidsSwitch"
        name='settings_pin_toggle'
        checked={Boolean(state.partsManagerPIN)}
        onclick={(e) => {
          const { partsManagerPIN } = state;
          if (partsManagerPIN) {
            if (prompt('Enter PIN to disable parental controls :') === partsManagerPIN) {
              for (const key in state) {
                if (key.startsWith('part ')) {
                  setState(key as keyof typeof state, true);
                }
              }
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
          else (e as Event).preventDefault();
        }}
      />

      <For each={parts()}>
        {(item) => (
          <ToggleSwitch
            id={'part ' + item.name}
            name={item.name as TranslationKeys}
            checked={state[('part ' + item.name) as keyof typeof state] as boolean}
            onclick={item.callback}
          />
        )}
      </For>
    </div>
  );
}
