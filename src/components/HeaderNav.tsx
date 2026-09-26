import { JSX, Show } from "solid-js";
import { navStore, openSubView, t, getList, listStore } from "@stores";
import { drawer, fetchCollection } from "@utils";

interface HeaderNavProps {
  title?: JSX.Element;
  extra?: JSX.Element;
}

export function handleNavClick(
  feature: "queue" | "search" | "library" | "list",
) {
  if (navStore.active === feature) {
    navStore[feature].ref?.scrollIntoView({ behavior: "smooth" });
  } else if (feature === "list") {
    if (drawer.lastList) {
      const { id, type, shared } = drawer.lastList;
      if (type === "collection") fetchCollection(id, shared);
      else getList(id, type as any);
    } else {
      openSubView("list");
    }
  } else {
    openSubView(feature);
  }
}

export default function HeaderNav(props: HeaderNavProps) {
  return (
    <>
      <div class="header-title">{props.title}</div>

      <nav class="header-nav">
        <span
          class="header-nav-item"
          classList={{ active: navStore.active === "queue" }}
          onclick={() => handleNavClick("queue")}
        >
          {t("nav_queue")}
        </span>
        <span
          class="header-nav-item"
          classList={{ active: navStore.active === "search" }}
          onclick={() => handleNavClick("search")}
        >
          {t("nav_search")}
        </span>
        <span
          class="header-nav-item"
          classList={{ active: navStore.active === "library" }}
          onclick={() => handleNavClick("library")}
        >
          {t("nav_library")}
        </span>
        <span
          class="header-nav-item header-nav-list"
          classList={{ active: navStore.active === "list" }}
          onclick={() => handleNavClick("list")}
          title={listStore.name || t("nav_list")}
        >
          {listStore.name || t("nav_list")}
        </span>

        <Show when={props.extra}>
          <div class="header-nav-extra">{props.extra}</div>
        </Show>
      </nav>
    </>
  );
}
