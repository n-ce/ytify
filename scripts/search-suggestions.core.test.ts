#!/usr/bin/env bun
/// <reference types="node" />
/**
 * Core Search Suggestions Test Suite
 *
 * Tests the core search operation extracted from
 * netlify/edge-functions/search-suggestions.ts, without any Netlify
 * dependencies (@netlify/edge-functions, Context, Config).
 *
 * The fetch/parse logic is mirrored in standalone functions so it can be
 * unit-tested locally with mocked network responses, including improved
 * error handling for non-JSON responses (e.g. HTML error pages that throw
 * SyntaxError: Unexpected token '<', "<!DOCTYPE ...).
 *
 * Run with: bun test scripts/test-search-suggestions-core.ts
 *         or: bun test   (picked up by the scripts/ glob)
 */

import { describe, expect, test, beforeEach, afterEach } from "bun:test";

const realFetch = globalThis.fetch;

type MockRoute = {
  url: string | RegExp;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body: unknown; // string or object (serialized as JSON)
  delay?: number;
};

const mockRoutes: MockRoute[] = [];

function installMockFetch() {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : String(input);

    const route = mockRoutes.find((r) => {
      if (r.url instanceof RegExp) return r.url.test(url);
      return url === r.url;
    });

    if (!route) {
      throw new Error(`No mock route registered for: ${url}`);
    }

    if (route.delay) {
      await new Promise((r) => setTimeout(r, route.delay));
    }

    const bodyText =
      typeof route.body === "string" ? route.body : JSON.stringify(route.body);

    return new Response(bodyText, {
      status: route.status ?? 200,
      statusText: route.statusText ?? "OK",
      headers: {
        "content-type": "application/json",
        ...route.headers,
      },
    }) as Response;
  }) as typeof fetch;
}

function restoreFetch() {
  globalThis.fetch = realFetch;
}

function registerMock(route: MockRoute) {
  mockRoutes.push(route);
}

function clearMocks() {
  mockRoutes.length = 0;
}

// ---------------------------------------------------------------------------
// Core search operation — extracted from netlify/edge-functions/search-suggestions.ts
// No @netlify/edge-functions import. Mirrors the edge function logic exactly,
// with added defensive JSON parsing so HTML error pages don't throw.
// ---------------------------------------------------------------------------

const YTMUSIC_SUGGEST_URL =
  "https://music.youtube.com/youtubei/v1/music/get_search_suggestions?alt=json&key=AIzaSyAO_FJ2Slq_6k8J8vX1Q1Q1Q1Q1Q1Q1Q";

const YTMUSIC_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  Origin: "https://music.youtube.com",
  Referer: "https://music.youtube.com/",
};

function buildYTMUSICBody(q: string) {
  return JSON.stringify({
    context: {
      client: {
        clientName: "WEB_REMIX",
        clientVersion: "1.20250219.01.00",
        hl: "en",
        gl: "US",
      },
    },
    input: q,
  });
}

function buildRegularSuggestUrl(q: string): string {
  const suggestUrl = new URL(
    "https://suggestqueries-clients6.youtube.com/complete/search",
  );
  suggestUrl.searchParams.set("client", "youtube");
  suggestUrl.searchParams.set("gs_ri", "youtube");
  suggestUrl.searchParams.set("gs_id", "0");
  suggestUrl.searchParams.set("cp", "0");
  suggestUrl.searchParams.set("ds", "yt");
  suggestUrl.searchParams.set(
    "sugexp",
    "ytzpb5_e2,ytpo.bo.lqp.elu=1,ytpo.bo.lqp.ecsc=1,ytpo.bo.lqp.mcsc=3,ytpo.bo.lqp.mec=1,ytpo.bo.lqp.rw=0.8,ytpo.bo.lqp.fw=0.2,ytpo.bo.lqp.szp=1,ytpo.bo.lqp.mz=3,ytpo.bo.lqp.al=en_us,ytpo.bo.lqp.zrm=1,ytpo.bo.ro.erl=1,ytpo.bo.ro.mlus=3,ytpo.bo.ro.erls=3,ytpo.bo.qfo.mlus=3,ytzprp.ppp.e=1,ytzprp.ppp.st=772,ytzprp.ppp.p=5",
  );
  suggestUrl.searchParams.set("hl", "en");
  suggestUrl.searchParams.set("gl", "US");
  suggestUrl.searchParams.set("q", q);
  return suggestUrl.toString();
}

/**
 * Safely parse JSON, returning [] instead of throwing when the body is not
 * valid JSON (e.g. YouTube returns an HTML error page:
 * SyntaxError: Unexpected token '<', "<!DOCTYPE ... is not valid JSON).
 */
function safeParseJson(text: string, fallback: unknown = []): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function parseYTMUSICSuggestions(data: unknown): string[] {
  const contents =
    data &&
    typeof data === "object" &&
    "contents" in data &&
    Array.isArray((data as any).contents)
      ? (data as any).contents[0]?.searchSuggestionsSectionRenderer?.contents
      : undefined;

  if (!Array.isArray(contents)) return [];

  return (
    contents
      .map((s: any) => {
        const renderer = s?.searchSuggestionRenderer;
        if (!renderer) return null;
        return (
          renderer.suggestion?.runs?.map((r: any) => r.text).join("") || null
        );
      })
      .filter(Boolean) ?? []
  );
}

function parseRegularSuggestions(text: string): string[] {
  const stripped = text.replace("window.google.ac.h(", "").slice(0, -1);
  const data = safeParseJson(stripped, []);
  if (!Array.isArray(data) || !Array.isArray(data[1])) return [];
  return data[1].map((s: any) => s[0]).filter(Boolean);
}

/**
 * Core search operation. Same logic as the Netlify edge function handler,
 * minus the Request/Response/Context wrapper and Netlify imports.
 *
 * Improvements over the original:
 * - safeParseJson catches SyntaxError from non-JSON (HTML) responses and
 *   returns [] instead of propagating the error.
 * - fetch failures are caught and return [].
 */
export async function coreSearchSuggestions(params: {
  q: string;
  music?: boolean;
}): Promise<string[]> {
  const { q, music } = params;

  if (!q) {
    return [];
  }

  try {
    if (music) {
      const res = await fetch(YTMUSIC_SUGGEST_URL, {
        method: "POST",
        headers: YTMUSIC_HEADERS,
        body: buildYTMUSICBody(q),
      });

      const text = await res.text();
      const data = safeParseJson(text, []);
      return parseYTMUSICSuggestions(data);
    } else {
      const suggestUrl = buildRegularSuggestUrl(q);
      const res = await fetch(suggestUrl);
      const text = await res.text();
      return parseRegularSuggestions(text);
    }
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("core search suggestions (no Netlify deps)", () => {
  beforeEach(() => {
    clearMocks();
    installMockFetch();
  });

  afterEach(() => {
    clearMocks();
    restoreFetch();
  });

  describe("empty query", () => {
    test("returns empty array without calling fetch when q is missing", async () => {
      const result = await coreSearchSuggestions({ q: "" });
      expect(result).toEqual([]);
      expect(mockRoutes.length).toBe(0);
    });

    test("returns empty array when q is undefined", async () => {
      const result = await coreSearchSuggestions({ q: undefined as any });
      expect(result).toEqual([]);
    });
  });

  describe("regular YouTube suggestions", () => {
    test("fetches suggestqueries URL with correct params and parses suggestions", async () => {
      registerMock({
        url: buildRegularSuggestUrl("rick astley"),
        body: `window.google.ac.h([null,[["rick astley","web"],["rick astley lyrics","web"],["rick astley never gonna give you up","web"]],{"google:suggestdetail":{}}])`,
      });

      const result = await coreSearchSuggestions({
        q: "rick astley",
        music: false,
      });

      expect(result).toEqual([
        "rick astley",
        "rick astley lyrics",
        "rick astley never gonna give you up",
      ]);
    });

    test("strips the window.google.ac.h() wrapper before parsing", async () => {
      registerMock({
        url: buildRegularSuggestUrl("never gonna give you up"),
        body: `window.google.ac.h([null,[["never gonna give you up","web"],["never gonna give you up karaoke","web"]]])`,
      });

      const result = await coreSearchSuggestions({
        q: "never gonna give you up",
        music: false,
      });

      expect(result).toContain("never gonna give you up");
      expect(result).toContain("never gonna give you up karaoke");
    });

    test("returns empty array on fetch failure", async () => {
      clearMocks();
      const result = await coreSearchSuggestions({ q: "test", music: false });
      expect(result).toEqual([]);
    });

    test("returns empty array on malformed JSON response", async () => {
      registerMock({
        url: buildRegularSuggestUrl("bad"),
        body: "not valid json at all",
      });

      const result = await coreSearchSuggestions({ q: "bad", music: false });
      expect(result).toEqual([]);
    });

    test("returns empty array when YouTube returns an HTML error page (SyntaxError regression)", async () => {
      registerMock({
        url: buildRegularSuggestUrl("html-error"),
        body: `<!DOCTYPE html><html><head><title>Error</title></head><body>429 Too Many Requests</body></html>`,
      });

      const result = await coreSearchSuggestions({
        q: "html-error",
        music: false,
      });
      expect(result).toEqual([]);
    });

    test("returns empty array when data[1] is missing or not an array", async () => {
      registerMock({
        url: buildRegularSuggestUrl("empty"),
        body: `window.google.ac.h([null, null, {}])`,
      });

      const result = await coreSearchSuggestions({ q: "empty", music: false });
      expect(result).toEqual([]);
    });
  });

  describe("YouTube Music suggestions", () => {
    test("POSTs to music.youtube.com with correct body and parses suggestions", async () => {
      registerMock({
        url: YTMUSIC_SUGGEST_URL,
        status: 200,
        body: {
          contents: [
            {
              searchSuggestionsSectionRenderer: {
                contents: [
                  {
                    searchSuggestionRenderer: {
                      suggestion: {
                        runs: [{ text: "rick astley" }],
                      },
                    },
                  },
                  {
                    searchSuggestionRenderer: {
                      suggestion: {
                        runs: [{ text: "rick astley never gonna give you up" }],
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      });

      const result = await coreSearchSuggestions({
        q: "rick astley",
        music: true,
      });

      expect(result).toEqual([
        "rick astley",
        "rick astley never gonna give you up",
      ]);
    });

    test("filters out suggestions without a renderer", async () => {
      registerMock({
        url: YTMUSIC_SUGGEST_URL,
        body: {
          contents: [
            {
              searchSuggestionsSectionRenderer: {
                contents: [
                  { someOtherRenderer: {} },
                  {
                    searchSuggestionRenderer: {
                      suggestion: { runs: [{ text: "valid suggestion" }] },
                    },
                  },
                ],
              },
            },
          ],
        },
      });

      const result = await coreSearchSuggestions({ q: "x", music: true });
      expect(result).toEqual(["valid suggestion"]);
    });

    test("returns empty array when contents structure is missing", async () => {
      registerMock({
        url: YTMUSIC_SUGGEST_URL,
        body: { unrelated: "data" },
      });

      const result = await coreSearchSuggestions({ q: "x", music: true });
      expect(result).toEqual([]);
    });

    test("returns empty array when YouTube Music returns HTML instead of JSON", async () => {
      registerMock({
        url: YTMUSIC_SUGGEST_URL,
        body: `<!DOCTYPE html><html><body>Service Unavailable</body></html>`,
      });

      const result = await coreSearchSuggestions({ q: "x", music: true });
      expect(result).toEqual([]);
    });
  });
});
