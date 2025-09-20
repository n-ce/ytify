import { setStore, t } from '../../lib/stores';
import { config, setConfig } from '../../lib/utils/config.ts';
import ToggleSwitch from './ToggleSwitch.tsx';

export default function() {
  let head!: HTMLElement;

  return (
    <div>
      <b class="hide" ref={head} onclick={() => head.classList.toggle('hide')}>
        {t('nav_search')}
      </b>

      <ToggleSwitch
        id="LinkCaptureSwitch"
        name='settings_link_capturing'
        checked={config.searchBarLinkCapture}
        onclick={() => {
          setConfig('searchBarLinkCapture', !config.searchBarLinkCapture);
        }}
      />

      <ToggleSwitch
        id="suggestionsSwitch"
        name='settings_display_suggestions'
        checked={config.searchSuggestions}
        onclick={() => {
          setConfig('searchSuggestions', !config.searchSuggestions);
          setStore('snackbar', t('settings_reload'));
        }}
      />
    </div>
  );
}
