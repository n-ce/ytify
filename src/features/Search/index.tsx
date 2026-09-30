import { onMount, Show, lazy } from "solid-js";
import "./Search.css";
import Results from "./Results";
import Input from "./Input";
import { searchStore, t, setNavStore } from "@stores";
import Filters from "./Filters";
import HeaderNav from "@components/HeaderNav";
import HeaderActions from "@components/HeaderActions";

const About = lazy(() => import("./About"));

export default function () {
  let searchRef!: HTMLElement;

  onMount(() => {
    setNavStore("search", "ref", searchRef);
    searchRef.scrollIntoView();
  });

  return (
    <section class="search" ref={searchRef}>
      <header class="sticky-bar">
        <HeaderNav title={<p>{t("nav_search")}</p>} />
        <HeaderActions />
      </header>

      <form class="superInputContainer">
        <Input />
        <Filters />
      </form>

      <Show
        when={searchStore.query || searchStore.results.length > 0}
        fallback={<About />}
      >
        <Results />
      </Show>
    </section>
  );
}
