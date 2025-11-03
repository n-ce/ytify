import { createSignal, createEffect, lazy, onMount, onCleanup, JSXElement } from 'solid-js';
import { setStore } from '@lib/stores';
import { config } from '@lib/utils';

const OfflineView = lazy(() => import('./OfflineView'));

const checkOnlineStatus = (): Promise<boolean> => {
  return fetch('/favicon.ico?_=' + new Date().getTime(), {
    method: 'HEAD',
    cache: 'no-store',
  })
    .then(response => response.ok)
    .catch(() => false);
};

export default function SyncWrapper(props: { children?: JSXElement }) {
  const [isOnline, setOnline] = createSignal(false); // Initial state is offline until checked
  let intervalId: NodeJS.Timeout;

  onMount(() => {
    setStore('syncState', 'synced'); // Initialize syncState when wrapper mounts

    // Initial check
    checkOnlineStatus().then(status => setOnline(status));

    // Periodic polling
    intervalId = setInterval(async () => {
      setOnline(await checkOnlineStatus());
    }, 30000); // Check every 30 seconds
  });

  onCleanup(() => {
    clearInterval(intervalId); // Clean up interval on unmount
  });

  // React to changes in the online state for syncing
  createEffect(() => {
    if (isOnline()) {
      import('@lib/modules/cloudSync').then(({ runSync }) => {
        runSync(config.dbsync!); // config.dbsync is guaranteed to exist here
      });
    }
  });

  return isOnline() ? props.children : <OfflineView />;
}
