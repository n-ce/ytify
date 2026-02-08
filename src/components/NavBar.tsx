import { For } from 'solid-js';
import './NavBar.css';
import { setConfig } from '@lib/utils';
import { navStore, setNavStore, store, setStore, t } from '@lib/stores';

type NavItem = {
    id: 'Hub' | 'Library' | 'Search' | 'Settings',
    icon: string,
    activeIcon: string,
    labelKey: TranslationKeys,
    action: () => void
};

export default function() {

  function saveHome(name: 'Hub' | 'Library' | 'Search') {
      if (store.homeView === name && navStore.home.state) {
        setNavStore('home', 'state', false);
      } else {
        setStore('homeView', name);
        setConfig('home', name);
        setNavStore('home', 'state', true);
        navStore.home.ref?.scrollIntoView();
      }
      if (navStore.settings.state) setNavStore('settings', 'state', false);
  }
  
  function toggleSettings() {
      setNavStore('settings', 'state', !navStore.settings.state);
  }

  const items: NavItem[] = [
    { 
        id: 'Hub', 
        labelKey: 'nav_hub', 
        icon: 'ri-home-5-line', 
        activeIcon: 'ri-home-5-fill',
        action: () => saveHome('Hub')
    },
    { 
        id: 'Search', 
        labelKey: 'nav_search', 
        icon: 'ri-search-2-line', 
        activeIcon: 'ri-search-2-fill',
        action: () => saveHome('Search')
    },
    { 
        id: 'Library', 
        labelKey: 'nav_library', 
        icon: 'ri-archive-stack-line', 
        activeIcon: 'ri-archive-stack-fill',
        action: () => saveHome('Library')
    },
    {
        id: 'Settings',
        labelKey: 'nav_settings',
        icon: 'ri-settings-4-line',
        activeIcon: 'ri-settings-4-fill',
        action: () => toggleSettings()
    }
  ];

  const isActive = (id: string) => {
      if (id === 'Settings') return navStore.settings.state;
      return navStore.home.state && store.homeView === id && !navStore.settings.state;
  };

  return (
    <nav class="main-nav">
      <div class="nav-logo">
          <i class="ri-music-2-fill"></i>
          <span class="nav-logo-text">Ytify</span>
      </div>
      
      <div class="nav-items">
          <For each={items}>
              {(item) => (
                  <button 
                    class="nav-item" 
                    classList={{ active: isActive(item.id) }}
                    onclick={() => item.action()}
                    aria-label={t(item.labelKey)}
                  >
                      <i class={isActive(item.id) ? item.activeIcon : item.icon}></i>
                      <span class="nav-label">{t(item.labelKey)}</span>
                  </button>
              )}
          </For>
      </div>
    </nav>
  );
}
