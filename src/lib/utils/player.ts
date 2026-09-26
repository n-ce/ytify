import { playerStore, setPlayerStore, setStore, store, t } from "@stores";
import {
  config,
  convertSStoHHMMSS,
  getTracksMap,
  saveTracksMap,
  handleXtags,
  preferredStream,
  proxyHandler,
  generateImageUrl,
} from "@utils";
import { getCachedOpusUrl, streamCache } from "@modules/audioCache";
import { isQueuePrefetchActive } from "../modules/queuePrefetch";

export async function applyMetadata(data: TrackItem) {
  setPlayerStore("stream", data);

  let music = false;
  let authorText = playerStore.stream.author || "";
  if (data.author?.endsWith(" - Topic")) {
    music = true;
    authorText = data.author.slice(0, -8);
  }

  setPlayerStore("isMusic", music);

  const metadataObj: MediaMetadataInit = {
    title: data.title,
    artist: authorText,
    album: playerStore.context.src,
  };

  const img = generateImageUrl(data.id, "maxres", music);
  if (config.loadImage) {
    setPlayerStore("mediaArtwork", img);
    metadataObj.artwork = [
      { src: img, sizes: "96x96" },
      { src: img, sizes: "128x128" },
      { src: img, sizes: "192x192" },
      { src: img, sizes: "256x256" },
      { src: img, sizes: "384x384" },
      { src: img, sizes: "512x512" },
    ];
  }

  document.title = data.title + " - ytify";

  if ("mediaSession" in navigator) {
    const { updateMediaSessionPosition } =
      await import("@modules/mediaSession");
    updateMediaSessionPosition();
    navigator.mediaSession.metadata = new MediaMetadata(metadataObj);
  }

  // Dynamic fix for tracks with corrupted "Release - Topic" author
  const rawAuthor = data.author?.trim().toLowerCase();
  if (rawAuthor === "release - topic" || rawAuthor === "release") {
    import("@modules/metadataFixer").then(async (m) => {
      const fixed = await m.fixSingleTrack(data);
      if (fixed.author !== data.author && playerStore.stream.id === data.id) {
        applyMetadata(fixed);
        const tracks = getTracksMap();
        if (tracks[data.id]) {
          tracks[data.id].author = fixed.author;
          tracks[data.id].authorId = fixed.authorId;
          tracks[data.id].modified = Date.now();
          saveTracksMap(tracks);
          setStore("libraryUpdated", (c) => (c || 0) + 1);
        }
      }
    });
  }
}

export async function applyAudioStreams(
  audioStreams: AudioStream[],
  prefetchNode?: HTMLAudioElement,
) {
  if (!prefetchNode) setPlayerStore("status", t("player_audiostreams_setup"));

  const noOfBitrates = audioStreams.length;

  if (!noOfBitrates) {
    setPlayerStore("status", t("player_audiostreams_null"));
    setPlayerStore("playbackState", "none");
    return;
  }

  const stream = await preferredStream(handleXtags(audioStreams));
  const target = prefetchNode || playerStore.audio;
  delete target.dataset.retried;
  target.src = proxyHandler(stream.url, Boolean(prefetchNode));
}

let playerAbortController: AbortController;
export async function player(id?: string) {
  if (playerAbortController) playerAbortController.abort();

  playerAbortController = new AbortController();

  if (!id) return;

  const enforceVideo = !playerStore.isMusic && playerStore.isWatching;

  if (!enforceVideo) {
    try {
      // getCachedOpusUrl is a no-op while caching is off.
      const cachedUrl = await getCachedOpusUrl(id);
      if (cachedUrl) {
        const tracks = getTracksMap();
        const track = tracks[id] || playerStore.stream;
        if (track?.title) {
          await applyMetadata({
            id,
            title: track.title,
            author: track.author,
            duration: track.duration,
            authorId: track.authorId,
          });
        }

        delete playerStore.audio.dataset.retried;
        playerStore.audio.src = cachedUrl;
        setPlayerStore({
          playbackState: "playing",
          status: "",
        });
        playerStore.audio.play().catch(() => {});
        return;
      }
    } catch (e) {
      console.warn(
        "[OPFS] Failed to play from cache, falling back to network",
        e,
      );
    }

    setPlayerStore({
      playbackState: "loading",
      status: "Loading Audio...",
    });
  }

  if (!store.useSaavn) setStore("useSaavn", true);
  else if (playerStore.stream.author?.endsWith("Topic") && !streamCache.get(id))
    return import("../modules/jioSaavn").then((mod) => mod.default());

  const getStreamData = await import("@modules/getStreamData").then(
    (mod) => mod.default,
  );
  const data = await getStreamData(id, playerAbortController.signal);

  if (data && "adaptiveFormats" in data)
    setPlayerStore({
      data,
      fullDuration: data.lengthSeconds,
    });
  else {
    const errorData = data as Record<"error" | "message", string>;
    setPlayerStore({
      playbackState: "none",
      status: errorData.message || errorData.error || "Loading Audio Failed",
    });
    setStore("snackbar", playerStore.status);
    return;
  }

  const invidiousData = data as Invidious;

  await applyMetadata({
    id,
    title: invidiousData.title,
    author: invidiousData.author,
    duration: convertSStoHHMMSS(invidiousData.lengthSeconds),
    authorId: invidiousData.authorId,
  });

  await applyAudioStreams(
    invidiousData.adaptiveFormats
      .filter((f) => f.type.startsWith("audio"))
      .sort((a, b) => parseInt(a.bitrate) - parseInt(b.bitrate)),
  );

  if (config.similarContent && !enforceVideo && !isQueuePrefetchActive())
    import("../modules/enqueueRelatedStreams").then((mod) =>
      mod.default(invidiousData.recommendedVideos),
    );

  // related streams imported into discovery after 1min 40seconds, short streams are naturally filtered out

  if (config.discover)
    import("../modules/setDiscoveries").then((mod) => {
      setTimeout(() => {
        mod.default(id, invidiousData.recommendedVideos);
      }, 1e5);
    });
}
