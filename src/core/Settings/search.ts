import { html } from 'uhtml';
import ToggleSwitch from './ToggleSwitch';
import { i18n } from '../../scripts/i18n';
import { setState, state } from '../../lib/store';
import { notify } from '../../lib/utils';

export default function() {
  return html`
    <div>
      <b>
        <i class="ri-search-2-line"></i>
        <p>${i18n('settings_search')}</p>
      </b>

      ${ToggleSwitch({
    id: "defaultFilterSongs",
    name: 'settings_set_songs_as_default_filter',
    checked: state.searchFilter === 'music_songs',
    handler: () => {
      setState('searchFilter',
        state.searchFilter ?
          '' : 'music_songs'
      );
      location.assign('/search');
    }
  })}

      ${ToggleSwitch({
    id: "suggestionsSwitch",
    name: 'settings_display_suggestions',
    checked: state.searchSuggestions,
    handler: () => {
      setState('searchSuggestions', !state.searchSuggestions);
      notify(i18n('settings_reload'));
    }
  })}
    </div>
  `;
}
