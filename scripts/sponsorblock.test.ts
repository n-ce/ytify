// Mock browser globals for test environment
if (typeof (globalThis as any).location === "undefined") {
  (globalThis as any).location = new URL("https://ytify.app/");
}
if (typeof (globalThis as any).document === "undefined") {
  (globalThis as any).document = {
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

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { config } from "../src/config";
import { playerStore } from "../src/store";
import {
  fetchSponsorSegments,
  checkSponsorBlock,
  clearSponsorSegments,
} from "../src/modules/sponsorBlock";

describe("sponsorBlock module", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    config.sponsorblock = true;
    clearSponsorSegments();
    playerStore.audio.currentTime = 0;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearSponsorSegments();
    config.sponsorblock = false;
  });

  test("fetches and sets segments correctly", async () => {
    globalThis.fetch = (async (url: string) => {
      expect(url).toContain("videoID=test123");
      return new Response(
        JSON.stringify([
          { category: "sponsor", segment: [30, 60] },
          { category: "intro", segment: [0, 10] },
        ]),
        { status: 200 },
      );
    }) as any;

    await fetchSponsorSegments("test123");

    // Intro segment (0 - 10): at 0s, skips to 10s
    playerStore.audio.currentTime = 0;
    checkSponsorBlock(0);
    expect(playerStore.audio.currentTime).toBe(10);

    // Normal section (15s): no skip
    playerStore.audio.currentTime = 15;
    checkSponsorBlock(15);
    expect(playerStore.audio.currentTime).toBe(15);

    // Sponsor segment (30 - 60): at 35s, skips to 60s
    playerStore.audio.currentTime = 35;
    checkSponsorBlock(35);
    expect(playerStore.audio.currentTime).toBe(60);
  });

  test("does nothing when config.sponsorblock is false", async () => {
    config.sponsorblock = false;
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify([{ category: "sponsor", segment: [10, 20] }]),
        { status: 200 },
      );
    }) as any;

    await fetchSponsorSegments("test123");
    playerStore.audio.currentTime = 12;
    checkSponsorBlock(12);
    expect(playerStore.audio.currentTime).toBe(12);
  });

  test("clearSponsorSegments resets segments and aborts pending fetch", async () => {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify([{ category: "sponsor", segment: [10, 20] }]),
        { status: 200 },
      );
    }) as any;

    await fetchSponsorSegments("test123");
    clearSponsorSegments();

    playerStore.audio.currentTime = 15;
    checkSponsorBlock(15);
    expect(playerStore.audio.currentTime).toBe(15);
  });
});
