import { navStore, openSubView, t, getList } from "@stores";
import { drawer, fetchCollection } from "@utils";

export default function NavBar() {
  return (
    <nav class="app-navbar">
      <i
        aria-label={t("nav_queue")}
        class="ri-order-play-fill"
        classList={{ on: navStore.active === "queue" }}
        onclick={() => {
          if (navStore.active === "queue") {
            navStore.queue.ref?.scrollIntoView({ behavior: "smooth" });
          } else {
            openSubView("queue");
          }
        }}
      ></i>

      <i
        aria-label={t("nav_search")}
        class={
          "ri-search-2-" + (navStore.active === "search" ? "fill" : "line")
        }
        classList={{ on: navStore.active === "search" }}
        onclick={() => {
          if (navStore.active === "search") {
            navStore.search.ref?.scrollIntoView({ behavior: "smooth" });
          } else {
            openSubView("search");
          }
        }}
      ></i>

      <i
        aria-label={t("nav_library")}
        class={
          "ri-archive-stack-" +
          (navStore.active === "library" ? "fill" : "line")
        }
        classList={{ on: navStore.active === "library" }}
        onclick={() => {
          if (navStore.active === "library") {
            navStore.library.ref?.scrollIntoView({ behavior: "smooth" });
          } else {
            openSubView("library");
          }
        }}
      ></i>

      <i
        aria-label={t("nav_list")}
        class="ri-play-list-2-fill"
        classList={{ on: navStore.active === "list" }}
        onclick={() => {
          if (navStore.active === "list") {
            navStore.list.ref?.scrollIntoView({ behavior: "smooth" });
          } else if (drawer.lastList) {
            const { id, type, shared } = drawer.lastList;
            if (type === "collection") fetchCollection(id, shared);
            else getList(id, type as any);
          } else {
            openSubView("list");
          }
        }}
      ></i>
    </nav>
  );
}
