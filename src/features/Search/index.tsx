import { onCleanup, onMount, Show, lazy } from "solid-js";
import './Search.css';
import Results from './Results';
import Input from "./Input";
import { resetSearch, setNavStore, searchStore, t, navStore } from "@lib/stores";
import Filters from "./Filters";

const About = lazy(() => import('./About'));

export default function() {
  let searchRef!: HTMLElement;

  onMount(() => {
    setNavStore('search', 'ref', searchRef);
    searchRef.scrollIntoView();
  });

  onCleanup(resetSearch);

  function toggleFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  return (
    <section class="search" ref={searchRef}>
      <header class="sticky-bar">
        <p>{t('nav_search')}</p>

        <div class="right-group">
          <Show when={!matchMedia('(display-mode: standalone)').matches}>
            <i
              class="ri-fullscreen-line"
              aria-label={t('settings_fullscreen')}
              onclick={toggleFullScreen}
            ></i>
          </Show>
          <Show when={!navStore.settings.state}>
            <i
              class="ri-settings-line"
              aria-label={t('nav_settings')}
              onclick={() => setNavStore('settings', 'state', true)}
            ></i>
          </Show>
        </div>
      </header>

      <form class="superInputContainer">
        <Input />
        <Filters />
      </form>

      <Show when={searchStore.query || searchStore.results.length > 0} fallback={<About />}>
        <Results />
      </Show>
    </section>
  );
}
