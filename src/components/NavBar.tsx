import './NavBar.css';
import { setConfig } from '@lib/utils';
import { navStore, setNavStore, store, setStore, openFeature } from '@lib/stores';

export default function() {


  type Nav = 'Hub' | 'Library' | 'Search';

  function saveHome(name: '' | Nav) {
    if (store.homeView === name && navStore.home.state) {
      setNavStore('home', 'state', false);
    } else {
      setStore('homeView', name);
      setConfig('home', name);
      openFeature('home', navStore.home.ref!);

    }
  }

  const navView = (item: Nav) => navStore.home.state && store.homeView === item;

  return (
    <nav>
      <i
        aria-label="Queue"
        class="ri-order-play-fill"
        classList={{ on: navStore.queue.state }}
        onclick={() => {
          setNavStore('queue', 'state', !navStore.queue.state);
        }}
      ></i>

      <i
        aria-label="Hub"
        class="ri-store-2-line"
        classList={{ 'on': navView('Hub') }}
        onclick={() => saveHome('Hub')}
      ></i>
      <i
        aria-label="Library"
        class="ri-archive-stack-line"
        classList={{ 'on': navView('Library') }}
        onclick={() => saveHome('Library')}
      ></i>
      <i
        aria-label="Search"
        class="ri-search-2-line"
        classList={{ 'on': navView('Search') }}
        onclick={() => saveHome('Search')}
      ></i>

    </nav>
  );
}
