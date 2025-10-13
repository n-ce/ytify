import { t } from '@lib/stores';
import { config, setConfig } from '@lib/utils/config.ts';
import ToggleSwitch from './ToggleSwitch.tsx';
import { getHub, updateHub } from '@lib/modules/hub.ts';
import { deleteCollection, getCollection } from '@lib/utils/library.ts';

export default function() {

  return (
    <>
      <ToggleSwitch
        id='discoverSwitch'
        name='settings_store_discoveries'
        checked={config.discover}
        onclick={(e) => {
          let configVal = (e.target as HTMLInputElement).checked;
          if (!configVal) {
            const data = getHub();
            const count = Object.keys(data.discovery || {}).length || 0;
            if (confirm(t("settings_clear_discoveries", count.toString()))) {
              delete data.discovery;
              updateHub(data);
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
            const db = getCollection('history') || [];
            const count = db.length;
            if (confirm(t("settings_clear_history", count.toString()))) {
              deleteCollection('history');
              configVal = false;
            } else e.preventDefault();
          }
          setConfig('history', configVal);
        }}
      />
    </>
  );
}
