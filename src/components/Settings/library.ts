import { html } from 'uhtml';
import ToggleSwitch from './ToggleSwitch';
import { i18n } from '../../scripts/i18n';
import { removeSaved, save } from '../../lib/utils';
import { getSaved } from '../../lib/store';
import { getDB, saveDB } from '../../lib/libraryUtils';

export default function() {
  return html`
    <div>
      <b>
        <i class="ri-stack-line"></i>
        <p>${i18n('settings_library')}</p>
      </b>

      ${ToggleSwitch({
    id: "startupTab",
    name: 'settings_set_as_default_tab',
    checked: getSaved('startupTab') === '/library',
    handler: () => {
      const _ = 'startupTab';
      if (getSaved(_))
        removeSaved(_);
      else
        save(_, '/library');
    }
  })}

      ${ToggleSwitch({
    id: "dbsync",
    name: 'settings_library_sync',
    checked: Boolean(getSaved('dbsync')),
    handler: e => {
      const _ = 'dbsync';
      if (getSaved(_)) removeSaved(_);
      else {
        function hashCreator(text: string) {
          const msgBuffer = new TextEncoder().encode(text);
          crypto.subtle.digest('SHA-256', msgBuffer)
            .then(hashBuffer => {
              const hash = Array
                .from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
              save(_, hash);
              location.reload();
            });
        }

        const termsAccepted = confirm('Data will be automatically deleted after one week of inactivity.\nytify is not responsible for data loss.\n\nI Understand');
        if (termsAccepted) {
          const username = prompt('Enter Username :');
          if (username) {
            const password = prompt('Enter Password :');
            const confirmpw = prompt('Confirm Password :');
            if (password && password === confirmpw)
              hashCreator(username + password);
            else alert('Incorrect Information!');
          }
        }
        e.preventDefault();
      }
    }
  })}

      ${ToggleSwitch({
    id: 'discoverSwitch',
    name: 'settings_store_discoveries',
    checked: getSaved('discover') !== 'off',
    handler: e => {
      if (e.target.checked)
        removeSaved('discover');
      else {
        const db = getDB();
        const count = Object.keys(db.discover || {}).length || 0;
        if (confirm(i18n("settings_clear_discoveries", count.toString()))) {
          delete db.discover;
          saveDB(db);
          save('discover', 'off');
        }
        else e.preventDefault();
      }
    }
  })}

      ${ToggleSwitch({
    id: 'historySwitch',
    name: 'settings_store_history',
    checked: getSaved('history') !== 'off',
    handler: e => { // Changed from onClick to handler
      if (e.target.checked)
        removeSaved('history');
      else {
        const db = getDB();
        const count = Object.keys(db.history || {}).length || 0;
        if (confirm(i18n("settings_clear_history", count.toString()))) {
          delete db.history;
          saveDB(db);
          save('history', 'off');
        } else e.preventDefault();
      }
    }
  })}
    </div>
  `;
}
