import ToggleSwitch from './ToggleSwitch.tsx';
import { setState, state } from '../../lib/store.ts';
import { i18n, notify } from '../../lib/utils.ts';

export default function() {
  return (
    <div>
      <b>
        <i class="ri-search-2-line"></i>
        <p>{i18n('settings_search')}</p>
      </b>

      <ToggleSwitch
        id="defaultFilterSongs"
        name='settings_set_songs_as_default_filter'
        checked={state.searchFilter === 'music_songs'}
        onclick={() => {
          setState('searchFilter',
            state.searchFilter ?
              '' : 'music_songs'
          );
          location.assign('/search');
        }}
      />

      <ToggleSwitch
        id="suggestionsSwitch"
        name='settings_display_suggestions'
        checked={state.searchSuggestions}
        onclick={() => {
          setState('searchSuggestions', !state.searchSuggestions);
          notify(i18n('settings_reload'));
        }}
      />
    </div>
  );
}
