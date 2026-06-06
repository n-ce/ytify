import { navStore, setNavStore, t } from "@stores";
import { setDrawer } from "@utils";

export default function() {

  return (
    <nav>
      <i
        aria-label={t('nav_queue')}
        class="ri-order-play-fill"
        classList={{ on: navStore.queue.state }}
        onclick={() => {
          setNavStore('queue', 'state', !navStore.queue.state);
        }}
      ></i>

      <i
        aria-label={t('nav_search')}
        class={'ri-search-2-' + (navStore.active === 'search' ? 'fill' : 'line')
        }
        classList={{
          'on': navStore.active === 'search'
        }}
        onclick={() => {
          setNavStore('active', 'search');
          setDrawer('lastMainFeature', 'search');
        }}
      ></i>

      <i
        aria-label={t('nav_library')}
        class={'ri-archive-stack-' + (navStore.active === 'library' ? 'fill' : 'line')}
        classList={{ 'on': navStore.active === 'library' }}
        onclick={() => {
          setNavStore('active', 'library');
          setDrawer('lastMainFeature', 'library');
        }}
      ></i>

    </nav>
  );
}
