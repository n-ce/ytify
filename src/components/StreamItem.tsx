import { Accessor, Show, createSignal } from "solid-js";
import "./StreamItem.css";
import {
  config,
  hostResolver,
  player,
  removeFromCollection,
  getCollectionItems,
  generateImageUrl,
} from "@utils";
import {
  setStore,
  store,
  queueStore,
  setQueueStore,
  listStore,
  navStore,
  setNavStore,
  playerStore,
  setPlayerStore,
} from "@stores";
import { getCachedThumbnailUrl } from "@modules/audioCache";

export default function (
  data: YTItem & {
    draggable?: boolean;
    inQueue?: boolean;
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
  },
) {
  const [getImage, setImage] = createSignal("");

  let parent!: HTMLAnchorElement;

  function handleThumbnailLoad(e: Event) {
    const src = getImage();
    if (src.startsWith("blob:") || src.includes("/logo192.png")) {
      parent.classList.remove("ravel");
      return;
    }

    const img = e.target as HTMLImageElement;

    // YouTube returns a 120x90 image for deleted/unavailable video thumbnails on i.ytimg.com
    if (
      src.includes("i.ytimg.com") &&
      img.naturalWidth === 120 &&
      img.naturalHeight === 90
    ) {
      if (src.includes("vi_webp")) {
        setImage(src.replace(".webp", ".jpg").replace("vi_webp", "vi"));
        return;
      }
      if (data.context?.src) {
        removeFromCollection(data.context?.id, [data.id]);
      }
      return;
    }

    parent.classList.remove("ravel");
  }

  function handleThumbnailError() {
    getCachedThumbnailUrl(data.id, music).then((cached) => {
      if (cached) {
        setImage(cached);
        parent.classList.remove("ravel");
        return;
      }
      const src = getImage();
      // 1. If custom data.img failed, try the video's YouTube thumbnail via proxy
      if (data.img && src.includes(data.img) && data.id) {
        setImage(generateImageUrl(data.id, "mq", music));
        return;
      }
      // 2. If webp via proxy failed, try jpg via proxy
      if (src.includes("vi_webp")) {
        setImage(src.replace(".webp", ".jpg").replace("vi_webp", "vi"));
        return;
      }
      // 3. If proxy failed or jpg via proxy failed, try direct i.ytimg.com
      if (src.includes("wsrv.nl") && data.id) {
        setImage(`https://i.ytimg.com/vi/${data.id}/mqdefault.jpg`);
        return;
      }
      // 4. Final fallback to logo
      setImage("/logo192.png");
      parent.classList.remove("ravel");
    });
  }

  const isAlbum =
    data.context?.id.startsWith("MPREb") || listStore.type === "album";
  const isFromArtist = data.context?.id?.startsWith("Artist - ");
  const isMusic = data.author?.endsWith("- Topic");
  const music =
    data.type === "song" ||
    data.context?.id === "favorites" ||
    isFromArtist ||
    (data.context?.src === "queue" && isMusic);

  if (config.loadImage && !isAlbum) {
    setImage(generateImageUrl(data.img || data.id, "mq", music));
    getCachedThumbnailUrl(data.id, music).then((cached) => {
      if (cached) setImage(cached);
    });
  }

  return (
    <a
      class="streamItem card card--interactive"
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
          setQueueStore("list", (list) => {
            const index = list.findIndex(
              (item) =>
                item.id === data.id &&
                item.context?.id === data.context?.id &&
                item.context?.src === data.context?.src,
            );
            if (index !== -1) {
              const newList = [...list];
              newList.splice(index, 1);
              return newList;
            }
            return list;
          });
          return;
        }

        if (data.mark?.mode()) {
          data.mark.set(data.id);
          return;
        }

        if (!e.target.classList.contains("ri-more-2-fill")) {
          if (playerStore.stream.id) {
            setQueueStore("history", (h) => [{ ...playerStore.stream }, ...h]);
          }

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

          setPlayerStore("context", {
            id: data.context?.id || "",
            src: data.context?.src || "",
          });

          const isPortrait = matchMedia("(orientation:portrait)").matches;

          if (isPortrait) {
            setNavStore("player", "state", Boolean(config.watchMode));

            if (config.watchMode) navStore.player.ref?.scrollIntoView();
          }

          if (
            config.contextualFill &&
            !queueStore.isSession &&
            (data.context?.src === "collection" ||
              data.context?.src === "playlists") &&
            data.context?.id !== "history"
          ) {
            const collectionItems =
              data.context.src === "collection"
                ? getCollectionItems(data.context.id)
                : listStore.list;
            const currentIndex = collectionItems.findIndex(
              (item) => item.id === data.id,
            );
            if (currentIndex !== -1) {
              const zigzagQueue: TrackItem[] = [];
              let left = currentIndex - 1;
              let right = currentIndex + 1;
              const len = collectionItems.length;

              const historyIds = new Set(queueStore.history.map((i) => i.id));

              while (left >= 0 || right < len) {
                if (right < len) {
                  const item = collectionItems[right++];
                  if (!historyIds.has(item.id)) zigzagQueue.push(item);
                }
                if (left >= 0) {
                  const item = collectionItems[left--];
                  if (!historyIds.has(item.id)) zigzagQueue.push(item);
                }
              }
              setQueueStore("list", zigzagQueue);
            }
          }

          player(data.id);

          setQueueStore("list", (list) => {
            const index = list.findIndex(
              (item) =>
                item.id === data.id &&
                item.context?.id === data.context?.id &&
                item.context?.src === data.context?.src,
            );
            if (index !== -1) {
              const newList = [...list];
              newList.splice(index, 1);
              return newList;
            }
            return list;
          });
        } else {
          setStore("actionsMenu", {
            id: data.id,
            title: data.title,
            author: data.author,
            duration: data.duration,
            authorId: data.authorId,
            context: data.context,
          });

          const { albumId } = data;
          if (store.actionsMenu?.albumId)
            setStore("actionsMenu", "albumId", undefined);
          if (albumId) setStore("actionsMenu", "albumId", albumId);
        }
      }}
    >
      <span>
        <Show when={!isAlbum && config.loadImage} fallback={data.duration}>
          <img
            crossorigin="anonymous"
            onerror={handleThumbnailError}
            onload={handleThumbnailLoad}
            src={getImage()}
          />
          <p class="duration">{data.duration}</p>
        </Show>
      </span>
      <div class="metadata">
        <p class="title">{data.title}</p>
        <div class="avu">
          <p class="author truncate">{data.author?.replace(" - Topic", "")}</p>
          <Show when={!isAlbum}>
            <p class="viewsXuploaded truncate">{data.subtext}</p>
          </Show>
        </div>
      </div>
      <Show when={data.draggable}>
        <i aria-label="Drag" class="ri-draggable"></i>
      </Show>
      <Show when={!data.draggable && !data.inQueue}>
        <i aria-label="More" class="ri-more-2-fill"></i>
      </Show>
    </a>
  );
}
