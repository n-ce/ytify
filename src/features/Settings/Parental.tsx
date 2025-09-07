import { For, createSignal, onMount } from 'solid-js';
import ToggleSwitch from './ToggleSwitch.tsx';
import { config, setConfig } from '../../lib/utils';
import { setStore, t } from '../../lib/stores';

export default function() {
  const [parts, setParts] = createSignal<{
    name: string,
    callback: (arg0: Event & { target: HTMLElement }) => void
  }[]>([]);

  onMount(async () => {
    if (config.partsManagerPIN) {
      const partsModule = await import('../../lib/modules/partsManager.ts');
      setParts(partsModule.default());
    }
  });

  return (
    <div>
      <b>
        <i class="ri-parent-line"></i>
        <p>{t('settings_parental_controls')}</p>
      </b>

      <ToggleSwitch
        id="kidsSwitch"
        name='settings_pin_toggle'
        checked={Boolean(config.partsManagerPIN)}
        onclick={(e) => {
          const { partsManagerPIN } = config;
          if (partsManagerPIN) {
            if (prompt('Enter PIN to disable parental controls :') === partsManagerPIN) {
              for (const key in config) {
                if (key.startsWith('part ')) {
                  setConfig(key as keyof typeof config, true);
                }
              }
              setConfig('partsManagerPIN', '');
              setStore('snackbar', t('settings_reload'));
            } else {
              alert(t('settings_pin_incorrect'));
              e.preventDefault();
            }
            return;
          }
          const pin = prompt(t('settings_pin_message'));
          if (pin) {
            setConfig('partsManagerPIN', pin);
            setStore('snackbar', t('settings_reload'));
          }
          else (e as Event).preventDefault();
        }}
      />

      <For each={parts()}>
        {(item) => (
          <ToggleSwitch
            id={'part ' + item.name}
            name={item.name as TranslationKeys}
            checked={config[('part ' + item.name) as keyof typeof config] as boolean}
            onclick={item.callback}
          />
        )}
      </For>
    </div>
  );
}
