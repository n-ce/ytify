import { onMount, Show } from "solid-js";
import "./Search.css";
import Results from "./Results";
import Input from "./Input";
import { searchStore, t, setNavStore, closeSubView } from "@stores";
import Filters from "./Filters";

export default function () {
  let searchRef!: HTMLElement;

  onMount(() => {
    setNavStore("search", "ref", searchRef);
    searchRef.scrollIntoView();
  });

  return (
    <section class="search" ref={searchRef}>
      <header class="sticky-bar">
        <p>{t("nav_search")}</p>
        <div class="right-group">
          <i
            aria-label={t("close")}
            class="ri-close-large-line"
            onclick={closeSubView}
          ></i>
        </div>
      </header>

      <form class="superInputContainer">
        <Input />
        <Filters />
      </form>

      <Show when={searchStore.query || searchStore.results.length > 0}>
        <Results />
      </Show>
    </section>
  );
}
