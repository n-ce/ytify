import { getDB, saveDB } from "../lib/libraryUtils";
import { notify } from "../lib/utils";

export default function(dbhash: string, syncBtn: HTMLElement) {

  const hashpoint = location.origin + '/dbs/' + dbhash;
  const importIcon = 'ri-cloud-fill';
  const needsSyncIcon = 'ri-cloud-off-fill'
  const isSynced = () => syncBtn.className === importIcon;
  const startLoad = () => syncBtn.className = 'ri-loader-3-line';

  function sync() {
    if (isSynced()) return;

    startLoad();

    fetch(hashpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: localStorage.getItem('library'),
    })
      .then(res => res.ok)
      .then(() => {
        syncBtn.className = importIcon;
        setTimeout(() => {
          readyToFetch = true;
        }, 1e5);
      })
      .catch(() => {
        syncBtn.className = needsSyncIcon + ' error';
      })
  }


  let readyToFetch = true;
  const fetchFromCloud = () =>
    readyToFetch ?
      fetch(hashpoint)
        .then(res => res.json())
        .then(l => saveDB(l, 'cloud')) :
      new Promise((res) => {
        const id = setInterval(() => {
          if (readyToFetch)
            clearInterval(id);
          res(fetchFromCloud());
        }, 1e4);
      });


  let timeoutId = 0;
  addEventListener('dbchange', (e) => {
    if (e.detail.change === 'cloud')
      return;
    syncBtn.className = needsSyncIcon;
    const newTimeoutId = window.setTimeout(sync, 1e4);
    if (timeoutId)
      clearTimeout(timeoutId);
    timeoutId = newTimeoutId;
  });

  syncBtn.addEventListener('click', () => {
    if (isSynced()) {
      startLoad();
      fetchFromCloud()
        .then(() => {
          syncBtn.className = importIcon;
        })
        .catch(() => {
          syncBtn.className = needsSyncIcon + ' error';
        });
    }
    else sync();
  });

  if (!Object.keys(getDB()).length) {
    if (confirm('Do you want to import your library from your account?')) {
      fetchFromCloud()
        .catch(() => notify('No Existing Library Found.'))
        .finally(() => syncBtn.className = importIcon);
    }
  }
  else fetchFromCloud()
    .finally(() => syncBtn.className = importIcon);

}
