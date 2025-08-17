import { openDialog, t } from '../../lib/stores';
import { config, setConfig } from '../../lib/utils/config.ts';
import { getDB, saveDB } from '../../lib/utils/library.ts';
import ToggleSwitch from './ToggleSwitch.tsx';

export default function() {
  return (
    <div>
      <b>
        <i class="ri-stack-line"></i>
        <p>{t('settings_library')}</p>
      </b>

      <ToggleSwitch
        id="startupTab"
        name='settings_set_as_default_tab'
        checked={config.startupTab === '/library'}
        onclick={() => {
          setConfig('startupTab',
            config.startupTab === '/library' ?
              '/search' : '/library'
          );
        }}
      />

      <ToggleSwitch
        id="dbsync"
        name='settings_library_sync'
        checked={Boolean(config.dbsync)}
        onclick={async (e) => {
          let hash = '';
          async function hashCreator(text: string) {
            const msgBuffer = new TextEncoder().encode(text);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

            hash = Array
              .from(new Uint8Array(hashBuffer))
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');

            openDialog('snackbar', t('settings_reload'));
          }
          if (!config.dbsync) {
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
          setConfig('dbsync', hash);
        }}
      />

      <ToggleSwitch
        id='discoverSwitch'
        name='settings_store_discoveries'
        checked={config.discover}
        onclick={(e) => {
          let configVal = (e.target as HTMLInputElement).checked;
          if (!configVal) {
            const db = getDB();
            const count = Object.keys(db.discover || {}).length || 0;
            if (confirm(t("settings_clear_discoveries", count.toString()))) {
              delete db.discover;
              saveDB(db);
              configVal = false;
            }
            else e.preventDefault();
          }
          setConfig('discover', configVal);
        }}
      />

      <ToggleSwitch
        id='historySwitch'
        name='settings_store_history'
        checked={config.history}
        onclick={(e) => {
          let configVal = (e.target as HTMLInputElement).checked;
          if (!configVal) {
            const db = getDB();
            const count = Object.keys(db.history || {}).length || 0;
            if (confirm(t("settings_clear_history", count.toString()))) {
              delete db.history;
              saveDB(db);
              configVal = false;
            } else e.preventDefault();
          }
          setConfig('history', configVal);
        }}
      />
    </div>
  );
}
