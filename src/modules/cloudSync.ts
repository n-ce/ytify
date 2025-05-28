import { getDB, saveDB } from "../lib/libraryUtils";
import { getSaved } from "../lib/store";
import { notify } from "../lib/utils";

export default function(dbhash: string, syncBtn: HTMLElement) {

  const hashpoint = location.origin + '/dbs/' + dbhash;
  const cls = (state: string = '') => `ri-cloud${state}-fill`;

  function sync() {
    if (syncBtn.className === cls())
      return;
    syncBtn.className = 'ri-loader-3-line';

    fetch(hashpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: getSaved('library'),
    })
      .then(res => res.ok)
      .then(() => {
        syncBtn.className = cls();
      })
      .catch(() => {
        syncBtn.className = cls('-off') + ' error';
      })
  }


  if (Object.keys(getDB()).length) {

    let timeoutId = 0;
    addEventListener('dbchange', () => {
      syncBtn.className = cls('-off');
      const newTimeoutId = window.setTimeout(sync, 30000);
      if (timeoutId)
        clearTimeout(timeoutId);
      timeoutId = newTimeoutId;
    });

    syncBtn.addEventListener('click', () => {
      if (syncBtn.className = cls()) {
        syncBtn.className = 'ri-loader-3-line';
        fetch(hashpoint)
          .then(res => res.json())
          .then(saveDB)
          .then(() => {
            syncBtn.className = cls();
          })
          .catch(() => {
            syncBtn.className = cls('-off') + ' error';
          });
      }
      else sync();
    })
  }
  else {
    if (confirm('Do you want to import your library from your account?')) {
      fetch(hashpoint)
        .then(res => res.json())
        .then(saveDB)
        .catch(() => notify('No Data Found!'));
    }
  }

}
