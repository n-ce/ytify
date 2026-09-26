import { describe, expect, test } from "bun:test";
import {
  parseDuration,
  convertSStoHHMMSS,
  idFromURL,
  hostResolver,
  shuffle,
  reorderItem,
} from "../src/lib/utils/core";

describe("core/time", () => {
  test("parseDuration parses HH:MM:SS, MM:SS, SS, and empty correctly", () => {
    expect(parseDuration("01:02:03")).toBe(3723);
    expect(parseDuration("05:30")).toBe(330);
    expect(parseDuration("45")).toBe(45 * 60);
    expect(parseDuration("")).toBe(0);
  });

  test("convertSStoHHMMSS formats properly", () => {
    expect(convertSStoHHMMSS(-1)).toBe("");
    expect(convertSStoHHMMSS(Infinity)).toBe("Emergency Mode");
    expect(convertSStoHHMMSS(0)).toBe("00:00");
    expect(convertSStoHHMMSS(65)).toBe("01:05");
    expect(convertSStoHHMMSS(3665)).toBe("1:01:05");
  });
});

describe("core/url", () => {
  test("idFromURL extracts YouTube ID correctly", () => {
    expect(idFromURL("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(idFromURL("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(idFromURL(null)).toBeUndefined();
    expect(idFromURL("not-a-url")).toBeUndefined();
  });

  test("hostResolver transforms watch and playlist URLs", () => {
    const origin = "https://ytify.app";
    expect(hostResolver("/watch?v=123", origin)).toBe(
      "https://ytify.app?s=123",
    );
    expect(hostResolver("/playlists=123", origin)).toBe(
      "https://ytify.app?playlists=123",
    );
  });
});

describe("core/array", () => {
  test("shuffle retains elements and handles empty/single", () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle([1])).toEqual([1]);
    const original = [1, 2, 3, 4, 5];
    const shuffled = shuffle([...original]);
    expect(shuffled.sort()).toEqual(original.sort());
  });

  test("reorderItem moves element forward and backward correctly", () => {
    const list = ["A", "B", "C", "D", "E"];
    expect(reorderItem(list, 1, 3)).toEqual(["A", "C", "D", "B", "E"]);
    expect(reorderItem(list, 3, 1)).toEqual(["A", "D", "B", "C", "E"]);
    expect(reorderItem(list, 0, 4)).toEqual(["B", "C", "D", "E", "A"]);
    expect(reorderItem(list, 4, 0)).toEqual(["E", "A", "B", "C", "D"]);
    expect(reorderItem(list, 2, 2)).toEqual(["A", "B", "C", "D", "E"]);
    expect(reorderItem(list, -1, 2)).toEqual(list);
    expect(reorderItem(list, 1, 10)).toEqual(list);
  });
});
