import { describe, expect, test, beforeEach } from "bun:test";
import { getShardName } from "../src/backend/utils.ts";
import getCatalog, {
  clearCatalogCacheForTests,
} from "../src/backend/getCatalog.ts";
import worker from "../src/backend/worker.ts";

describe("catalog shard resolution", () => {
  beforeEach(() => {
    clearCatalogCacheForTests();
  });

  test("getShardName computes deterministic 2-digit hex shard name", () => {
    expect(getShardName("-abc")).toBe("2d");
    expect(getShardName("0abc")).toBe("30");
    expect(getShardName("9abc")).toBe("39");
    expect(getShardName("Abc")).toBe("41");
    expect(getShardName("Zbc")).toBe("5a");
    expect(getShardName("_abc")).toBe("5f");
    expect(getShardName("abc")).toBe("61");
    expect(getShardName("zbc")).toBe("7a");
    expect(getShardName("")).toBe("00");
  });

  test("resolves canonical song by requesting online repo shards", async () => {
    // 0--oFf-QEQE exists in Moods-And-Genres-Dataset songs/30.json
    const res = await getCatalog(["0--oFf-QEQE"]);

    expect(res.unresolved).toEqual([]);
    expect(res.resolved["0--oFf-QEQE"]).toBeDefined();

    const track = res.resolved["0--oFf-QEQE"];
    expect(track.id).toBe("0--oFf-QEQE");
    expect(track.title).toBe("In My Neighborhood");
    expect(track.author).toBe("Bubble Guppies Cast");
    expect(track.isSong).toBe(true);
    expect(track.type).toBe("song");
    expect(track.duration).toBe("01:29");
    expect(track.durationSeconds).toBe(89);
    expect(track.albumId).toBe("MPREb_cO7qy0r28oR");
    expect(track.img).toBe(
      "/LWF4k5RC55sN2n1gbhfSqeUen_qKNUyFdBL7Jvc_jc4mEfdIBT3En8EdjIwI8V_6yv2ncyQYFudqTShA8g",
    );
    expect(track.source).toBe("catalog_shard");
  });

  test("resolves canonical video by requesting online repo shards", async () => {
    // 0-2642SKhoo exists in Moods-And-Genres-Dataset videos/30.json
    const res = await getCatalog(["0-2642SKhoo"]);

    expect(res.unresolved).toEqual([]);
    expect(res.resolved["0-2642SKhoo"]).toBeDefined();

    const video = res.resolved["0-2642SKhoo"];
    expect(video.id).toBe("0-2642SKhoo");
    expect(video.title).toBe("Crois-moi ! (feat. Adeline Lovo)");
    expect(video.author).toBe("Gaëtan Roussel");
    expect(video.isSong).toBe(false);
    expect(video.type).toBe("video");
    expect(video.duration).toBe("03:30");
    expect(video.durationSeconds).toBe(210);
    expect(video.img).toBeUndefined();
    expect(video.source).toBe("catalog_shard");
  });

  test("handles mixed batch of songs, videos, and unresolved IDs", async () => {
    const res = await getCatalog([
      "0--oFf-QEQE",
      "0-2642SKhoo",
      "nonexistent123",
    ]);

    expect(res.resolved["0--oFf-QEQE"]?.isSong).toBe(true);
    expect(res.resolved["0-2642SKhoo"]?.isSong).toBe(false);
    expect(res.unresolved).toEqual(["nonexistent123"]);
  });

  test("POST /catalog with { ids: [...] } returns 200 with resolved & unresolved", async () => {
    const req = new Request("http://localhost:5173/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: ["0--oFf-QEQE", "0-2642SKhoo", "missingXYZ"],
      }),
    });
    const resp = await worker.fetch(req, {} as any, {} as any);

    expect(resp.status).toBe(200);
    const body = (await resp.json()) as any;
    expect(body.resolved["0--oFf-QEQE"]?.type).toBe("song");
    expect(body.resolved["0-2642SKhoo"]?.type).toBe("video");
    expect(body.unresolved).toEqual(["missingXYZ"]);
  });

  test("POST /catalog with raw array body [...] is accepted", async () => {
    const req = new Request("http://localhost:5173/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(["0--oFf-QEQE"]),
    });
    const resp = await worker.fetch(req, {} as any, {} as any);

    expect(resp.status).toBe(200);
    const body = (await resp.json()) as any;
    expect(body.resolved["0--oFf-QEQE"]).toBeDefined();
    expect(body.unresolved).toEqual([]);
  });

  test("rejects GET /catalog with 405 Method Not Allowed", async () => {
    const req = new Request("http://localhost:5173/catalog?id=0--oFf-QEQE", {
      method: "GET",
    });
    const resp = await worker.fetch(req, {} as any, {} as any);
    expect(resp.status).toBe(405);
  });

  test("returns 400 for missing or empty ids array", async () => {
    const req = new Request("http://localhost:5173/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [] }),
    });
    const resp = await worker.fetch(req, {} as any, {} as any);
    expect(resp.status).toBe(400);
  });
});
