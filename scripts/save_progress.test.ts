// Mock browser globals for test environment
if (typeof (globalThis as any).location === "undefined") {
  (globalThis as any).location = new URL("https://ytify.app/");
}
if (typeof (globalThis as any).history === "undefined") {
  (globalThis as any).history = {
    state: {},
    replaceState: () => {},
  };
}
if (typeof (globalThis as any).document === "undefined") {
  (globalThis as any).document = {
    title: "",
    activeElement: null,
    documentElement: { lang: "en", style: { setProperty: () => {} } },
  };
}
if (typeof (globalThis as any).Audio === "undefined") {
  (globalThis as any).Audio = class {
    currentTime = 0;
    volume = 1;
    play = async () => {};
    pause = () => {};
    addEventListener = () => {};
  };
}
if (typeof (globalThis as any).navigator === "undefined") {
  (globalThis as any).navigator = {
    language: "en-US",
    mediaCapabilities: {
      decodingInfo: async () => ({ supported: true }),
    },
  };
} else if (!(globalThis as any).navigator.mediaCapabilities) {
  (globalThis as any).navigator.mediaCapabilities = {
    decodingInfo: async () => ({ supported: true }),
  };
}

import { describe, expect, test, beforeEach } from "bun:test";
import { playerStore, setPlayerStore, params, updateParam } from "../src/store";
import { applyMetadata } from "../src/modules/playback";

describe("player save progress and URL params", () => {
  beforeEach(() => {
    updateParam("s");
    updateParam("t");
    setPlayerStore("saveProgress", false);
  });

  test("saveProgress defaults to false when t param is absent", () => {
    expect(playerStore.saveProgress).toBe(false);
    expect(params.has("s")).toBe(false);
    expect(params.has("t")).toBe(false);
  });

  test("enabling save progress adds ?s= and ?t= params", () => {
    setPlayerStore("stream", {
      id: "video123",
      title: "Podcast Ep 1",
      author: "Creator",
      authorId: "creator123",
      duration: "10:00",
    });
    setPlayerStore("currentTime", 42);

    // Simulate clicking save progress button to turn it ON
    setPlayerStore("saveProgress", true);
    if (playerStore.stream.id) updateParam("s", playerStore.stream.id);
    updateParam("t", playerStore.currentTime.toString());

    expect(playerStore.saveProgress).toBe(true);
    expect(params.get("s")).toBe("video123");
    expect(params.get("t")).toBe("42");
  });

  test("disabling save progress removes both ?s= and ?t= params", () => {
    // Setup enabled state
    setPlayerStore("saveProgress", true);
    updateParam("s", "video123");
    updateParam("t", "42");
    expect(params.has("s")).toBe(true);
    expect(params.has("t")).toBe(true);

    // Simulate clicking save progress button to turn it OFF
    setPlayerStore("saveProgress", false);
    updateParam("t");
    updateParam("s");

    expect(playerStore.saveProgress).toBe(false);
    expect(params.has("s")).toBe(false);
    expect(params.has("t")).toBe(false);
  });

  test("applyMetadata on music track automatically resets saveProgress and removes ?s= and ?t=", async () => {
    // Enabled for podcast
    setPlayerStore("saveProgress", true);
    updateParam("s", "podcast123");
    updateParam("t", "99");

    // Next track is a music track
    await applyMetadata({
      id: "music456",
      title: "Song Title",
      author: "Artist - Topic",
      authorId: "artist456",
      duration: "03:30",
    });

    expect(playerStore.isMusic).toBe(true);
    expect(playerStore.saveProgress).toBe(false);
    expect(params.has("s")).toBe(false);
    expect(params.has("t")).toBe(false);
  });
});
