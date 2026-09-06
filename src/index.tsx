/* @refresh reload */

import {
  lazy,
  onMount,
  onCleanup,
  createSignal,
  Show,
  Switch,
  Match,
} from "solid-js";
import { render } from "solid-js/web";
import { themer, syncLibrary } from "@utils";
import {
  updateLang,
  setStore,
  store,
  navStore,
  setNavStore,
  playerStore,
  params,
} from "@stores";
import NavBar from "@components/NavBar";
import "./styles/global.css";

updateLang().then(() => {
  themer();

  render(() => <App />, document.body);
});

const MiniPlayer = lazy(() => import("@components/MiniPlayer"));
const ActionsMenu = lazy(() => import("@components/ActionsMenu"));
const SnackBar = lazy(() => import("@components/SnackBar"));

export default function App() {
  const [isPortrait, setIsPortrait] = createSignal(
    typeof window !== "undefined"
      ? window.matchMedia("(orientation: portrait)").matches
      : false,
  );

  let mainRef!: HTMLElement;
  let leftPanelRef!: HTMLDivElement;
  let rightPanelRef!: HTMLDivElement;

  onMount(async () => {
    const mql = window.matchMedia("(orientation: portrait)");
    const updateOrientation = (e: MediaQueryListEvent) =>
      setIsPortrait(e.matches);
    mql.addEventListener("change", updateOrientation);
    onCleanup(() => mql.removeEventListener("change", updateOrientation));

    let scrollTimeout: number;
    const checkScrollCompletion = () => {
      if (!mql.matches || !mainRef) return;
      const scrollLeft = mainRef.scrollLeft;
      const maxScroll = mainRef.scrollWidth - mainRef.clientWidth;

      // Fully scrolled to right panel (within 5px tolerance)
      if (maxScroll > 0 && scrollLeft >= maxScroll - 5) {
        if (navStore.player.state) {
          setNavStore("player", "state", false);
        }
      }
      // Fully scrolled to left panel (player)
      else if (scrollLeft <= 5) {
        if (!navStore.player.state) {
          setNavStore("player", "state", true);
        }
      }
    };

    const onScroll = () => {
      if (!mql.matches || !mainRef) return;
      clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(checkScrollCompletion, 60);
    };

    mainRef?.addEventListener("scroll", onScroll, { passive: true });
    mainRef?.addEventListener("scrollend", checkScrollCompletion, {
      passive: true,
    });
    onCleanup(() => {
      clearTimeout(scrollTimeout);
      mainRef?.removeEventListener("scroll", onScroll);
      mainRef?.removeEventListener("scrollend", checkScrollCompletion);
    });

    await import("@modules/start.ts").then((mod) => mod.default());

    if (params.has("s")) {
      setNavStore("player", "state", true);
      leftPanelRef?.scrollIntoView({ behavior: "instant" });
    } else {
      setNavStore("player", "state", false);
      rightPanelRef?.scrollIntoView({ behavior: "instant" });
    }

    setStore("syncState", "synced");
    syncLibrary("init");
  });

  const Queue = navStore.queue.component;
  const Search = navStore.search.component;
  const Library = navStore.library.component;
  const List = navStore.list.component;
  const Settings = navStore.settings.component;
  const Player = navStore.player.component;

  return (
    <>
      <main
        ref={mainRef}
        classList={{
          "player-closed": isPortrait() && !navStore.player.state,
        }}
      >
        <div class="left-panel" ref={leftPanelRef}>
          <Show when={!isPortrait()}>
            <NavBar />
          </Show>
          <Player />
        </div>
        <div class="right-panel" ref={rightPanelRef}>
          <div class="right-panel-content">
            <Switch>
              <Match when={navStore.active === "queue"}>
                <Queue />
              </Match>
              <Match when={navStore.active === "list"}>
                <List />
              </Match>
              <Match when={navStore.active === "settings"}>
                <Settings />
              </Match>
              <Match when={navStore.active === "library"}>
                <Library />
              </Match>
              <Match when={navStore.active === "search" || true}>
                <Search />
              </Match>
            </Switch>
          </div>

          <Show when={isPortrait()}>
            <Show
              when={
                !navStore.player.state &&
                (playerStore.playbackState !== "none" ||
                  Boolean(playerStore.stream.id))
              }
            >
              <MiniPlayer />
            </Show>
            <NavBar />
          </Show>
        </div>
      </main>

      <Show when={store.actionsMenu?.id}>
        <ActionsMenu />
      </Show>
      <Show when={store.snackbar}>
        <SnackBar />
      </Show>
    </>
  );
}
