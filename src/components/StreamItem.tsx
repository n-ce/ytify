import { Accessor, Show, createSignal } from "solid-js";
import "./StreamItem.css";
import {
  config,
  hostResolver,
  player,
  removeFromCollection,
  getCollectionItems,
} from "@lib/utils";
import { generateImageUrl } from "@lib/utils/image";
import {
  listStore,
  setNavStore,
  setPlayerStore,
  setStore,
  setQueueStore,
  navStore,
  playerStore,
  queueStore,
  store,
} from "@lib/stores";

export default function (data: {
  id: string;
  title: string;
  author?: string;
  duration: string;
  uploaded?: string;
  authorId?: string;
  views?: string;
  img?: string;
  albumId?: string;
  draggable?: boolean;
  context?: {
    src: Context;
    id: string;
  };
  mark?: {
    mode: Accessor<boolean>;
    set: (id: string) => void;
    get: (id: string) => boolean;
  };
  removeMode?: boolean;
}) {
  const [getImage, setImage] = createSignal("");
  let parent!: HTMLAnchorElement;

  function handleThumbnailLoad(e: Event) {
    const img = e.target as HTMLImageElement;
    const src = getImage();

    if (img.naturalWidth !== 120) {
      parent?.classList.remove("ravel");
      return;
    }
    if (src.includes("webp"))
      setImage(src.replace(".webp", ".jpg").replace("vi_webp", "vi"));
    else {
      if (data.context) removeFromCollection(data.context?.id, [data.id]);
    }
  }

  function handleThumbnailError() {
    const src = getImage();
    setImage(
      src.includes("vi_webp")
        ? src.replace(".webp", ".jpg").replace("vi_webp", "vi")
        : "/logo192.png", // Fallback
    );
    parent?.classList.remove("ravel");
  }

  const isAlbum = data.context?.id.startsWith("Album");
  const isFromArtist = data.context?.id?.startsWith("Artist - ");
  const isMusic = data.author?.endsWith("- Topic");

  // Basic Live detection from views/duration
  const isLive = () =>
    data.duration === "LIVE" ||
    data.views?.includes("watching") ||
    data.views?.includes("spectateurs");

  if (config.loadImage && !isAlbum)
    setImage(
      generateImageUrl(
        data.img || data.id,
        "mq",
        data.context?.id === "favorites" ||
          isFromArtist ||
          ((data.context?.src === "queue" || data.context?.src === "standby") &&
            isMusic),
      ),
    );

  return (
    <a
      class="content-card"
      classList={{
        ravel: config.loadImage && !isAlbum,
        marked: data.mark?.get(data.id),
        delete: data.removeMode,
      }}
      href={hostResolver("/watch?v=" + data.id)}
      ref={parent}
      onclick={(e) => {
        e.preventDefault();

        if (data.removeMode) {
          setQueueStore("list", (list) =>
            list.filter((item) => item.id !== data.id),
          );
          return;
        }

        if (data.mark?.mode()) {
          data.mark.set(data.id);
          return;
        }

        // Logic to stop propagation if clicking actions
        const target = e.target as HTMLElement;
        if (
          !target.closest(".card-action") &&
          !target.closest(".card-handle")
        ) {
          setPlayerStore("stream", {
            id: data.id,
            title: data.title,
            author: data.author || "",
            duration: data.duration,
            authorId: data.authorId || "",
          });

          if (data.albumId) setPlayerStore("stream", "albumId", data.albumId);
          else if (playerStore.stream.albumId)
            setPlayerStore("stream", "albumId", undefined);

          if (data.context)
            setPlayerStore("context", {
              id: data.context.id,
              src: data.context.src,
            });

          const isPortrait = matchMedia("(orientation:portrait)").matches;

          // Responsive logic from existing code
          if (isPortrait || config.landscapeSections === "1") {
            setNavStore("player", "state", Boolean(config.watchMode));
            if (config.watchMode) navStore.player.ref?.scrollIntoView();
          }

          // Contextual fill (ZigZag queue) logic
          if (
            config.contextualFill &&
            (data.context?.src === "collection" ||
              data.context?.src === "playlists" ||
              data.context?.src === "standby") &&
            data.context?.id !== "history"
          ) {
            const collectionItems =
              data.context.src === "collection"
                ? getCollectionItems(data.context.id)
                : data.context.src === "standby"
                  ? queueStore.standby
                  : listStore.list;
            const currentIndex = collectionItems.findIndex(
              (item) => item.id === data.id,
            );
            if (currentIndex !== -1) {
              const zigzagQueue: CollectionItem[] = [];
              let left = currentIndex - 1;
              let right = currentIndex + 1;
              const len = collectionItems.length;

              while (left >= 0 || right < len) {
                if (right < len) {
                  zigzagQueue.push(collectionItems[right++]);
                }
                if (left >= 0) {
                  zigzagQueue.push(collectionItems[left--]);
                }
              }
              setQueueStore("list", zigzagQueue);
            }
          }

          player(data.id);

          if (data.context?.src === "queue") {
            const indexToRemove = parseInt(data.context.id, 10);
            setQueueStore("list", (list) =>
              list.filter((_, idx) => idx !== indexToRemove),
            );
          }
        }
      }}
    >
      <div class="card-media">
        <Show
          when={!isAlbum && config.loadImage}
          fallback={<div class="placeholder">{data.duration}</div>}
        >
          <img
            crossorigin="anonymous"
            onerror={handleThumbnailError}
            onload={handleThumbnailLoad}
            src={getImage()}
          />
          <Show
            when={isLive()}
            fallback={<span class="card-duration">{data.duration}</span>}
          >
            <span class="card-badge" data-live>
              🔴 LIVE
            </span>
          </Show>
        </Show>
      </div>

      <div class="card-info">
        <h3 class="card-title">{data.title}</h3>
        <p class="card-meta">
          {data.author?.replace(" - Topic", "")}
          <Show when={data.views}> • {data.views}</Show>
          <Show when={data.uploaded}>
            {" "}
            • {data.uploaded?.replace("Streamed ", "")}
          </Show>
        </p>
      </div>

      {/* Actions */}
      <Show when={data.draggable}>
        <div class="card-handle">
          <i aria-label="Drag" class="ri-draggable"></i>
        </div>
      </Show>

      <Show when={!data.draggable && data.context?.src !== "queue"}>
        <button
          class="card-action"
          aria-label="Plus d'options"
          onclick={(e) => {
            e.preventDefault();
            e.stopPropagation(); // important

            setStore("actionsMenu", {
              id: data.id,
              title: data.title,
              author: data.author,
              duration: data.duration,
              authorId: data.authorId,
            });

            const { albumId } = data;
            if (store.actionsMenu?.albumId)
              setStore("actionsMenu", "albumId", undefined);
            if (albumId) setStore("actionsMenu", "albumId", albumId);
          }}
        >
          <i class="ri-more-2-fill"></i>
        </button>
      </Show>
    </a>
  );
}
