import ToggleSwitch from './ToggleSwitch.tsx';
import { setState, state } from '../../lib/store.ts';
import { getDB, saveDB } from '../../lib/libraryUtils.ts';
import { notify, i18n } from '../../lib/utils.ts';

export default function() {
  return (
    <div>
      <b>
        <i class="ri-stack-line"></i>
        <p>{i18n('settings_library')}</p>
      </b>

      <ToggleSwitch
        id="startupTab"
        name='settings_set_as_default_tab'
        checked={state.startupTab === '/library'}
        onclick={() => {
          setState('startupTab',
            state.startupTab === '/library' ?
              '/search' : '/library'
          );
        }}
      />

      <ToggleSwitch
        id="dbsync"
        name='settings_library_sync'
        checked={Boolean(state.dbsync)}
        onclick={async (e) => {
          let hash = '';
          async function hashCreator(text: string) {
            const msgBuffer = new TextEncoder().encode(text);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

            hash = Array
              .from(new Uint8Array(hashBuffer))
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');

            notify(i18n('settings_reload'));
          }
          if (!state.dbsync) {
            const termsAccepted = confirm('Data will be automatically deleted after one week of inactivity.\nytify is not responsible for data loss.\n\nI Understand');
            if (termsAccepted) {
              const username = prompt('Enter Username :');
              if (username) {
                const password = prompt('Enter Password :');
                const confirmpw = prompt('Confirm Password :');
                if (password && password === confirmpw)
                  await hashCreator(username + password);
                else alert('Incorrect Information!');
              }
            }
            e.preventDefault();
          }
          setState('dbsync', hash);
        }}
      />

      <ToggleSwitch
        id='discoverSwitch'
        name='settings_store_discoveries'
        checked={state.discover}
        onclick={(e) => {
          let stateVal = (e.target as HTMLInputElement).checked;
          if (!stateVal) {
            const db = getDB();
            const count = Object.keys(db.discover || {}).length || 0;
            if (confirm(i18n("settings_clear_discoveries", count.toString()))) {
              delete db.discover;
              saveDB(db);
              stateVal = false;
            }
            else e.preventDefault();
          }
          setState('discover', stateVal);
        }}
      />

      <ToggleSwitch
        id='historySwitch'
        name='settings_store_history'
        checked={state.history}
        onclick={(e) => {
          let stateVal = (e.target as HTMLInputElement).checked;
          if (!stateVal) {
            const db = getDB();
            const count = Object.keys(db.history || {}).length || 0;
            if (confirm(i18n("settings_clear_history", count.toString()))) {
              delete db.history;
              saveDB(db);
              stateVal = false;
            } else e.preventDefault();
          }
          setState('history', stateVal);
        }}
      />
    </div>
  );
}
