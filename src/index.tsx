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

  let leftPanelRef!: HTMLDivElement;
  let rightPanelRef!: HTMLDivElement;

  onMount(async () => {
    const mql = window.matchMedia("(orientation: portrait)");
    const updateOrientation = (e: MediaQueryListEvent) =>
      setIsPortrait(e.matches);
    mql.addEventListener("change", updateOrientation);
    onCleanup(() => mql.removeEventListener("change", updateOrientation));

    if (leftPanelRef) {
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (mql.matches) {
              setNavStore(
                "player",
                "state",
                entry.isIntersecting && entry.intersectionRatio > 0.5,
              );
            }
          });
        },
        { threshold: [0.5] },
      );
      obs.observe(leftPanelRef);
      onCleanup(() => obs.disconnect());
    }

    await import("@modules/start.ts").then((mod) => mod.default());

    if (params.has("s")) {
      leftPanelRef?.scrollIntoView({ behavior: "instant" });
    } else {
      rightPanelRef?.scrollIntoView({ behavior: "instant" });
    }

    setStore("syncState", "synced");
    syncLibrary("init");
  });

  const Search = navStore.search.component;
  const Library = navStore.library.component;
  const List = navStore.list.component;
  const Settings = navStore.settings.component;
  const Player = navStore.player.component;

  return (
    <>
      <main>
        <div class="left-panel" ref={leftPanelRef}>
          <Player />
        </div>
        <div
          class="right-panel"
          ref={rightPanelRef}
          classList={{
            "has-miniplayer":
              isPortrait() &&
              !navStore.player.state &&
              playerStore.playbackState !== "none",
          }}
        >
          <Switch>
            <Match when={navStore.active === "search"}>
              <Search />
            </Match>
            <Match when={navStore.active === "list"}>
              <List />
            </Match>
            <Match when={navStore.active === "settings"}>
              <Settings />
            </Match>
            <Match when={navStore.active === "library" || true}>
              <Library />
            </Match>
          </Switch>
        </div>
      </main>

      <Show
        when={
          isPortrait() &&
          !navStore.player.state &&
          playerStore.playbackState !== "none"
        }
      >
        <MiniPlayer />
      </Show>

      <Show when={store.actionsMenu?.id}>
        <ActionsMenu />
      </Show>
      <Show when={store.snackbar}>
        <SnackBar />
      </Show>
    </>
  );
}
