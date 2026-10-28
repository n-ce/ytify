import { beforeEach, describe, expect, test } from "bun:test";
import {
  clamp,
  convertSStoHHMMSS,
  generateImageUrl,
  hasLS,
  hostResolver,
  idFromURL,
  isTopicAuthor,
  lsGet,
  lsGetJSON,
  lsKeys,
  lsRemove,
  lsSet,
  lsSetJSON,
  normalizeAuthorKey,
  normalizeText,
  parseDuration,
  pickImage,
  reorderItem,
  shuffle,
  sortCollection,
  stripTopic,
  unique,
  withTopicSuffix,
} from "../src/utils";

class MemoryStorage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", {
  value: storage,
  configurable: true,
});

const track = (
  id: string,
  title: string,
  author: string,
  duration: string,
): TrackItem => ({ id, title, author, authorId: `${id}-author`, duration });

describe("time helpers", () => {
  test("parseDuration parses HH:MM:SS, MM:SS, SS and invalid input", () => {
    expect(parseDuration("01:02:03")).toBe(3723);
    expect(parseDuration("05:30")).toBe(330);
    expect(parseDuration("45")).toBe(45 * 60);
    expect(parseDuration("")).toBe(0);
  });

  test("convertSStoHHMMSS formats durations and edge cases", () => {
    expect(convertSStoHHMMSS(-1)).toBe("");
    expect(convertSStoHHMMSS(Infinity)).toBe("Emergency Mode");
    expect(convertSStoHHMMSS(0)).toBe("00:00");
    expect(convertSStoHHMMSS(65)).toBe("01:05");
    expect(convertSStoHHMMSS(3665)).toBe("1:01:05");
  });
});

describe("url helpers", () => {
  test("idFromURL extracts YouTube ids from common link shapes", () => {
    expect(idFromURL("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(idFromURL("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(idFromURL(null)).toBeUndefined();
    expect(idFromURL("not-a-url")).toBeUndefined();
  });

  test("hostResolver rewrites internal watch and playlist URLs", () => {
    const origin = "https://ytify.app";
    expect(hostResolver("/watch?v=123", origin)).toBe("https://ytify.app?s=123");
    expect(hostResolver("/playlists=123", origin)).toBe(
      "https://ytify.app?playlists=123",
    );
  });
});

describe("array helpers", () => {
  test("shuffle keeps the same elements and handles small arrays", () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle([1])).toEqual([1]);
    const original = [1, 2, 3, 4, 5];
    expect(shuffle([...original]).sort()).toEqual(original);
  });

  test("reorderItem moves items and rejects invalid indexes", () => {
    const list = ["A", "B", "C", "D", "E"];
    expect(reorderItem(list, 1, 3)).toEqual(["A", "C", "D", "B", "E"]);
    expect(reorderItem(list, 3, 1)).toEqual(["A", "D", "B", "C", "E"]);
    expect(reorderItem(list, 0, 4)).toEqual(["B", "C", "D", "E", "A"]);
    expect(reorderItem(list, 2, 2)).toEqual(list);
    expect(reorderItem(list, -1, 2)).toEqual(list);
    expect(reorderItem(list, 1, 10)).toEqual(list);
  });

  test("unique preserves first occurrence order", () => {
    expect(unique([1, 1, 2, 3, 2])).toEqual([1, 2, 3]);
    expect(unique([])).toEqual([]);
    expect(unique(["b", "a", "b"])).toEqual(["b", "a"]);
  });
});

describe("image helpers", () => {
  test("pickImage skips empty and maxresdefault candidates", () => {
    expect(pickImage(undefined, "", "https://x/maxresdefault.webp", "ok")).toBe(
      "ok",
    );
    expect(pickImage("first", "second")).toBe("first");
    expect(pickImage(undefined, null)).toBe("");
  });

  test("generateImageUrl builds video and artwork URLs", () => {
    expect(generateImageUrl("dQw4w9WgXcQ", "mq")).toBe(
      "https://wsrv.nl?url=https://i.ytimg.com/vi_webp/dQw4w9WgXcQ/mqdefault.webp",
    );
    expect(generateImageUrl("dQw4w9WgXcQ", "mq", true)).toBe(
      "https://wsrv.nl?url=https://i.ytimg.com/vi_webp/dQw4w9WgXcQ/mqdefault.webp&w=180&h=180&fit=cover",
    );
    expect(generateImageUrl("", "mq")).toBe("");
    expect(generateImageUrl("maxresdefault", "mq")).toBe("");
    expect(generateImageUrl("dQw4w9WgXcQ", "maxres")).toBe(
      "https://wsrv.nl?url=https://i.ytimg.com/vi_webp/dQw4w9WgXcQ/maxresdefault.webp",
    );
    expect(generateImageUrl("/ytc/avatar", "mq")).toBe(
      "https://wsrv.nl?url=https://yt3.googleusercontent.com/ytc/avatar=s720-c-k-c0x00ffffff-no-rj&output=webp&w=180",
    );
  });
});

describe("sorting", () => {
  const list = [
    track("1", "Beta", "Zed", "01:00"),
    track("2", "Alpha", "Ann", "00:30"),
    track("3", "Gamma", "Bob", "02:00"),
  ];

  test("sortCollection handles modified order without mutating input", () => {
    expect(sortCollection(list, "modified", "desc").map((t) => t.id)).toEqual([
      "1",
      "2",
      "3",
    ]);
    expect(sortCollection(list, "modified", "asc").map((t) => t.id)).toEqual([
      "3",
      "2",
      "1",
    ]);
    expect(list.map((t) => t.id)).toEqual(["1", "2", "3"]);
  });

  test("sortCollection sorts by name, artist and duration", () => {
    expect(sortCollection(list, "name", "asc").map((t) => t.id)).toEqual([
      "2",
      "1",
      "3",
    ]);
    expect(sortCollection(list, "artist", "desc").map((t) => t.id)).toEqual([
      "1",
      "3",
      "2",
    ]);
    expect(sortCollection(list, "duration", "asc").map((t) => t.id)).toEqual([
      "2",
      "1",
      "3",
    ]);
  });
});

describe("storage helpers", () => {
  beforeEach(() => storage.clear());

  test("hasLS reports an available localStorage", () => {
    expect(hasLS()).toBe(true);
  });

  test("lsGet and lsSet round-trip raw strings", () => {
    expect(lsGet("missing")).toBeNull();
    lsSet("key", "value");
    expect(lsGet("key")).toBe("value");
    lsRemove("key");
    expect(lsGet("key")).toBeNull();
  });

  test("lsGetJSON and lsSetJSON round-trip values and fall back safely", () => {
    expect(lsGetJSON("missing", { ok: false })).toEqual({ ok: false });
    lsSetJSON("json", { ok: true, items: [1, 2] });
    expect(
      lsGetJSON<{ ok: boolean; items: number[] } | null>("json", null),
    ).toEqual({ ok: true, items: [1, 2] });
    lsSet("broken", "{not json");
    expect(lsGetJSON("broken", "fallback")).toBe("fallback");
  });

  test("lsKeys lists keys by prefix in storage order", () => {
    lsSet("library_a", "1");
    lsSet("library_b", "2");
    lsSet("config", "3");
    expect(lsKeys("library_")).toEqual(["library_a", "library_b"]);
    expect(lsKeys()).toEqual(["library_a", "library_b", "config"]);
    expect(lsKeys("nope")).toEqual([]);
  });
});

describe("text helpers", () => {
  test("normalizeText lowercases and strips diacritics", () => {
    expect(normalizeText("Beyoncé")).toBe("beyonce");
    expect(normalizeText("  ÉDITH  ")).toBe("  edith  ");
    expect(normalizeText()).toBe("");
    expect(normalizeText(undefined)).toBe("");
  });

  test("isTopicAuthor recognises both suffix variants", () => {
    expect(isTopicAuthor("Artist - Topic")).toBe(true);
    expect(isTopicAuthor("Artist- Topic")).toBe(true);
    expect(isTopicAuthor("Artist - topic")).toBe(true);
    expect(isTopicAuthor("Artist")).toBe(false);
    expect(isTopicAuthor(undefined)).toBe(false);
  });

  test("stripTopic removes the suffix and trims other authors", () => {
    expect(stripTopic("Artist - Topic")).toBe("Artist");
    expect(stripTopic("Artist- Topic")).toBe("Artist");
    expect(stripTopic("  Artist  ")).toBe("Artist");
    expect(stripTopic(undefined)).toBe("");
  });

  test("withTopicSuffix normalises to exactly one suffix", () => {
    expect(withTopicSuffix("Artist")).toBe("Artist - Topic");
    expect(withTopicSuffix("Artist - Topic")).toBe("Artist - Topic");
    expect(withTopicSuffix("Artist- Topic")).toBe("Artist - Topic");
    expect(withTopicSuffix("  Artist  ")).toBe("Artist - Topic");
    expect(withTopicSuffix("")).toBe("");
    expect(withTopicSuffix(undefined)).toBe("");
  });

  test("normalizeAuthorKey ignores suffixes, diacritics and case", () => {
    expect(normalizeAuthorKey("Beyoncé - Topic")).toBe("beyonce");
    expect(normalizeAuthorKey("Beyonce- Topic")).toBe("beyonce");
    expect(normalizeAuthorKey("  BEYONCE  ")).toBe("beyonce");
    expect(normalizeAuthorKey(undefined)).toBe("");
  });
});

describe("math helpers", () => {
  test("clamp bounds values", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});
