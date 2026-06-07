import { navStore, setNavStore, t, getList } from "@stores";
import { setDrawer, drawer, fetchCollection } from "@utils";

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
          if (navStore.active === 'search') {
            navStore.search.ref?.scrollIntoView({ behavior: 'smooth' });
          } else {
            setNavStore('active', 'search');
            setDrawer('lastMainFeature', 'search');
          }
        }}
      ></i>

      <i
        aria-label={t('nav_library')}
        class={'ri-archive-stack-' + (navStore.active === 'library' ? 'fill' : 'line')}
        classList={{ 'on': navStore.active === 'library' }}
        onclick={() => {
          if (navStore.active === 'library') {
            navStore.library.ref?.scrollIntoView({ behavior: 'smooth' });
          } else {
            setNavStore('active', 'library');
            setDrawer('lastMainFeature', 'library');
          }
        }}
      ></i>

      <i
        aria-label={t('nav_list')}
        class="ri-play-list-2-fill"
        classList={{ 'on': navStore.active === 'list' }}
        onclick={() => {
          if (navStore.active === 'list') {
            navStore.list.ref?.scrollIntoView({ behavior: 'smooth' });
          } else if (drawer.lastList) {
            const { id, type, shared } = drawer.lastList;
            if (type === 'collection') fetchCollection(id, shared);
            else getList(id, type as any);
          } else {
            setNavStore('active', 'list');
          }
        }}
      ></i>

    </nav>
  );
}
