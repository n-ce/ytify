import { For, Show, createMemo } from "solid-js";
import { librarySections, cachingMode, type LibrarySectionKey } from "@config";
import {
  CACHED_COLLECTION,
  DISCOVERY_COLLECTION,
  fetchCollection,
  getCollectionsKeys,
  getMeta,
  RESERVED_COLLECTIONS,
} from "@modules/library";
import { t, store } from "@stores";

export default function (props: {
  scope: "quickAccess" | "myCollections";
  sort: "name" | "modified";
}) {
  // Reserved collection names match their librarySections key, so the
  // per-section toggles in the configure modal drive visibility directly.
  const isCollectionVisible = (item: string) => {
    const sections = librarySections();
    return item in sections
      ? Boolean(sections[item as LibrarySectionKey])
      : true;
  };

  const visibleCollections = createMemo(() => {
    store.libraryUpdated;
    return getCollectionsKeys()
      .filter((item) =>
        props.scope === "quickAccess"
          ? item in RESERVED_COLLECTIONS
          : !(item in RESERVED_COLLECTIONS),
      )
      .filter((item) =>
        props.scope === "quickAccess" ? isCollectionVisible(item) : true,
      );
  });

  const sortedCollections = createMemo(() => {
    const keys = visibleCollections();
    if (props.sort === "name") {
      return [...keys].sort((a, b) => a.localeCompare(b));
    }
    const meta = getMeta();
    return [...keys].sort((a, b) => (meta[b] || 0) - (meta[a] || 0));
  });

  const showCached = createMemo(
    () =>
      props.scope === "quickAccess" &&
      cachingMode() !== "off" &&
      librarySections().cached,
  );

  const showDiscovery = createMemo(
    () => props.scope === "quickAccess" && librarySections().discovery,
  );

  const hasVisibleItems = createMemo(
    () => visibleCollections().length > 0 || showCached() || showDiscovery(),
  );

  return (
    <div class="collection-list">
      <Show
        when={hasVisibleItems()}
        fallback={<p class="fallback">{t("library_empty")}</p>}
      >
        <For each={sortedCollections()}>
          {(item) => (
            <a
              href={"?collection=" + item}
              class="clxn_item"
              onclick={(e) => {
                e.preventDefault();
                fetchCollection(item);
              }}
            >
              <Show
                when={item in RESERVED_COLLECTIONS}
                fallback={
                  <>
                    <i class="ri-play-list-2-fill"></i>
                    {item}
                  </>
                }
              >
                <i class={RESERVED_COLLECTIONS[item][0]}></i>
                {t(RESERVED_COLLECTIONS[item][1])}
              </Show>
            </a>
          )}
        </For>
        <Show when={showCached()}>
          <a
            href={"?collection=" + CACHED_COLLECTION}
            class="clxn_item"
            onclick={(e) => {
              e.preventDefault();
              fetchCollection(CACHED_COLLECTION);
            }}
          >
            <i class={RESERVED_COLLECTIONS[CACHED_COLLECTION][0]}></i>
            {t(RESERVED_COLLECTIONS[CACHED_COLLECTION][1])}
          </a>
        </Show>
        <Show when={showDiscovery()}>
          <a
            href={"?collection=" + DISCOVERY_COLLECTION}
            class="clxn_item"
            onclick={(e) => {
              e.preventDefault();
              fetchCollection(DISCOVERY_COLLECTION);
            }}
          >
            <i class={RESERVED_COLLECTIONS[DISCOVERY_COLLECTION][0]}></i>
            {t(RESERVED_COLLECTIONS[DISCOVERY_COLLECTION][1])}
          </a>
        </Show>
      </Show>
    </div>
  );
}
