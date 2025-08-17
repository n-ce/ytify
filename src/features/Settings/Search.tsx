import { openDialog, t } from '../../lib/stores';
import { config, setConfig } from '../../lib/utils/config.ts';
import ToggleSwitch from './ToggleSwitch.tsx';

export default function() {
  return (
    <div>
      <b>
        <i class="ri-search-2-line"></i>
        <p>{t('settings_search')}</p>
      </b>

      <ToggleSwitch
        id="defaultFilterSongs"
        name='settings_set_songs_as_default_filter'
        checked={config.searchFilter === 'music_songs'}
        onclick={() => {
          setConfig('searchFilter',
            config.searchFilter ?
              '' : 'music_songs'
          );
          location.assign('/search');
        }}
      />

      <ToggleSwitch
        id="suggestionsSwitch"
        name='settings_display_suggestions'
        checked={config.searchSuggestions}
        onclick={() => {
          setConfig('searchSuggestions', !config.searchSuggestions);
          openDialog('snackbar', t('settings_reload'));
        }}
      />
    </div>
  );
}
