import { html } from 'uhtml';
import ToggleSwitch from './ToggleSwitch';
import { i18n } from '../../scripts/i18n';
import { getSaved } from '../../lib/store';
import { removeSaved, save } from '../../lib/utils';

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
    checked: getSaved('searchFilter') === 'music_songs',
    handler: () => {
      const _ = 'searchFilter';
      if (getSaved(_))
        removeSaved(_);
      else
        save(_, 'music_songs');
      location.assign('/search');
    }
  })}

      ${ToggleSwitch({
    id: "suggestionsSwitch",
    name: 'settings_display_suggestions',
    checked: getSaved('searchSuggestions') !== 'off',
    handler: () => {
      const _ = 'searchSuggestions';
      if (getSaved(_))
        removeSaved(_);
      else
        save(_, 'off');
      location.reload();
    }
  })}
    </div>
  `;
}
