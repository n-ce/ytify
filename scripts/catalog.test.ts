import { describe, expect, test } from "bun:test";
import { CatalogDO } from "../src/backend/CatalogDO";
import { UserSyncDO } from "../src/backend/UserSyncDO";
import { tracksToCanonical } from "../src/backend/catalog";
import {
  fakeDurableState,
  doFetch,
  postJson,
  readJson,
} from "./durableFixture";

describe("catalog/canonical_tracks", () => {
  test("upserts and reads tracks by id", async () => {
    const catalog = new CatalogDO(fakeDurableState() as any);
    const now = Date.now();

    const res = await postJson(catalog, "/tracks", {
      tracks: [
        canonicalTrack("aaaaaaaaaaa", "Song A", "Artist A", now),
        canonicalTrack("bbbbbbbbbbb", "Song B", "Artist B", now),
      ],
    });
    expect(await res.json()).toEqual({ written: 2 });

    // A body without a tracks array is rejected.
    const badBody = await postJson(catalog, "/tracks", {});
    expect(badBody.status).toBe(400);

    const body = await readJson(catalog, "/tracks?ids=aaaaaaaaaaa,missing");
    expect(Object.keys(body)).toEqual(["aaaaaaaaaaa"]);
    expect(body.aaaaaaaaaaa).toMatchObject({
      title: "Song A",
      author: "Artist A",
      duration: 180,
    });

    const missingResponse = await doFetch(catalog, "/track?id=missing");
    expect(missingResponse.status).toBe(404);
  });

  test("an older write never regresses a newer record", async () => {
    const catalog = new CatalogDO(fakeDurableState() as any);
    const now = Date.now();

    await postJson(catalog, "/tracks", {
      tracks: [canonicalTrack("aaaaaaaaaaa", "Fresh", "Artist A", now)],
    });
    await postJson(catalog, "/tracks", {
      tracks: [
        { ...canonicalTrack("aaaaaaaaaaa", "Stale", "Old", now - 60_000) },
      ],
    });

    const track = await readJson(catalog, "/track?id=aaaaaaaaaaa");
    expect(track.title).toBe("Fresh");
    expect(track.author).toBe("Artist A");
  });

  test("a newer partial record merges without zeroing existing fields", async () => {
    const catalog = new CatalogDO(fakeDurableState() as any);
    const now = Date.now();

    await postJson(catalog, "/tracks", {
      tracks: [canonicalTrack("aaaaaaaaaaa", "Song A", "Topic", now)],
    });
    await postJson(catalog, "/tracks", {
      tracks: [
        {
          ...canonicalTrack("aaaaaaaaaaa", "Song A", "Real Artist", now + 1000),
          duration: 0,
        },
      ],
    });

    const track = await readJson(catalog, "/track?id=aaaaaaaaaaa");
    expect(track.author).toBe("Real Artist");
    expect(track.duration).toBe(180);
  });

  test("stores songs in canonical_songs with album info and videos in canonical_videos without thumbnail", async () => {
    const catalog = new CatalogDO(fakeDurableState() as any);
    const now = Date.now();

    await postJson(catalog, "/tracks", {
      tracks: [
        {
          id: "song1111111",
          title: "Official Song",
          author: "Official Artist",
          authorId: "UC_SONG",
          duration: 200,
          durationStr: "03:20",
          isSong: true,
          thumbnailId: "/img_song1",
          albumId: "MPREb_album1",
          albumTitle: "Album One",
          source: "artist_featured",
          updatedAt: now,
        },
        {
          id: "video111111",
          title: "Fan Live Performance",
          author: "FanChannel",
          authorId: "UC_FAN",
          duration: 350,
          durationStr: "05:50",
          isSong: false,
          thumbnailId: "",
          source: "search",
          updatedAt: now,
        },
      ],
    });

    const tracks = await readJson(
      catalog,
      "/tracks?ids=song1111111,video111111",
    );
    expect(tracks.song1111111).toMatchObject({
      id: "song1111111",
      title: "Official Song",
      isSong: true,
      thumbnailId: "/img_song1",
      albumId: "MPREb_album1",
      albumTitle: "Album One",
    });
    expect(tracks.video111111).toMatchObject({
      id: "video111111",
      title: "Fan Live Performance",
      isSong: false,
      thumbnailId: "",
    });
    expect(tracks.video111111.albumId).toBeUndefined();

    // Verify direct SQLite table contents
    const sql = (catalog as any).sql;
    const songRow = sql
      .exec("SELECT * FROM canonical_songs WHERE id = ?", "song1111111")
      .one();
    expect(songRow.album_title).toBe("Album One");
    expect(songRow.thumbnail_id).toBe("/img_song1");

    const videoRow = sql
      .exec("SELECT * FROM canonical_videos WHERE id = ?", "video111111")
      .one();
    expect(videoRow.title).toBe("Fan Live Performance");
    expect(videoRow.thumbnail_id).toBeUndefined();
  });

  test("ATV tracks store only square thumbnails and reject rectangular video IDs", async () => {
    const catalog = new CatalogDO(fakeDurableState() as any);
    const now = Date.now();

    // 1. Song with 11-char video id as thumbnailId (rectangular)
    await postJson(catalog, "/tracks", {
      tracks: [
        {
          id: "song_rect",
          title: "Song With Rectangular Thumb",
          author: "Artist",
          authorId: "UC_ARTIST",
          duration: 180,
          durationStr: "03:00",
          isSong: true,
          thumbnailId: "dQw4w9WgXcQ", // 11-char video ID (rectangular)
          source: "innertube_scrape",
          updatedAt: now,
        },
        {
          id: "song_square",
          title: "Song With Square Thumb",
          author: "Artist",
          authorId: "UC_ARTIST",
          duration: 180,
          durationStr: "03:00",
          isSong: true,
          thumbnailId: "/a-/AOh14Gh8_square", // square Google CDN path
          source: "innertube_scrape",
          updatedAt: now,
        },
      ],
    });

    const res = await readJson(catalog, "/tracks?ids=song_rect,song_square");
    expect(res.song_rect.thumbnailId).toBe("");
    expect(res.song_square.thumbnailId).toBe("/a-/AOh14Gh8_square");

    const sql = (catalog as any).sql;
    const rectRow = sql
      .exec("SELECT * FROM canonical_songs WHERE id = ?", "song_rect")
      .one();
    expect(rectRow.thumbnail_id).toBe("");

    const squareRow = sql
      .exec("SELECT * FROM canonical_songs WHERE id = ?", "song_square")
      .one();
    expect(squareRow.thumbnail_id).toBe("/a-/AOh14Gh8_square");

    // 2. An update with rectangular thumbnail should not overwrite an existing square thumbnail
    await postJson(catalog, "/tracks", {
      tracks: [
        {
          id: "song_square",
          title: "Song With Square Thumb (Updated)",
          author: "Artist",
          authorId: "UC_ARTIST",
          duration: 180,
          durationStr: "03:00",
          isSong: true,
          thumbnailId: "new_rect_id",
          source: "user_sync",
          updatedAt: now + 1000,
        },
      ],
    });

    const squareRowAfter = sql
      .exec("SELECT * FROM canonical_songs WHERE id = ?", "song_square")
      .one();
    expect(squareRowAfter.thumbnail_id).toBe("/a-/AOh14Gh8_square");
    expect(squareRowAfter.title).toBe("Song With Square Thumb (Updated)");
  });

  test("links and resolves OMV and ATV counterparts", async () => {
    const catalog = new CatalogDO(fakeDurableState() as any);
    const now = Date.now();

    await postJson(catalog, "/tracks", {
      tracks: [
        {
          id: "song_atv_1",
          title: "Levitating",
          author: "Dua Lipa",
          authorId: "UC_DUA",
          duration: 203,
          durationStr: "03:23",
          isSong: true,
          thumbnailId: "/dua_thumb",
          albumId: "OLAK5uy_album",
          albumTitle: "Future Nostalgia",
          omvId: "video_omv_1",
          source: "fix_metadata",
          updatedAt: now,
        },
        {
          id: "video_omv_1",
          title: "Dua Lipa - Levitating (Official Music Video)",
          author: "Dua Lipa",
          authorId: "UC_DUA",
          duration: 220,
          durationStr: "03:40",
          isSong: false,
          thumbnailId: "",
          atvId: "song_atv_1",
          source: "fix_metadata",
          updatedAt: now,
        },
      ],
    });

    // 1. Verify tracks read preserves omvId and atvId
    const tracks = await readJson(
      catalog,
      "/tracks?ids=song_atv_1,video_omv_1",
    );
    expect(tracks.song_atv_1.omvId).toBe("video_omv_1");
    expect(tracks.video_omv_1.atvId).toBe("song_atv_1");

    // 2. Query counterparts endpoint for the video ID -> resolves the canonical song
    const counterparts = await readJson(
      catalog,
      "/counterparts?ids=video_omv_1,unknown_video",
    );
    expect(counterparts.video_omv_1).toBeDefined();
    expect(counterparts.video_omv_1).toMatchObject({
      id: "song_atv_1",
      title: "Levitating",
      isSong: true,
      albumId: "OLAK5uy_album",
      albumTitle: "Future Nostalgia",
      thumbnailId: "/dua_thumb",
      omvId: "video_omv_1",
    });
    expect(counterparts.unknown_video).toBeUndefined();
  });
});

describe("catalog/recommend", () => {
  test("scores curated playlists at +10 per shared track", async () => {
    const catalog = new CatalogDO(fakeDurableState() as any);
    const now = Date.now();
    const [a, b, c, d] = [
      "aaaaaaaaaaa",
      "bbbbbbbbbbb",
      "ccccccccccc",
      "ddddddddddd",
    ];

    await postJson(catalog, "/tracks", {
      tracks: [
        canonicalTrack(a, "Song A", "Artist A", now),
        canonicalTrack(b, "Song B", "Artist B", now),
        canonicalTrack(c, "Song C", "Artist C", now),
      ],
    });
    await postJson(catalog, "/playlists", {
      playlists: [
        playlist("PL1", "One match", [a, b], now),
        playlist("PL2", "Two matches", [c, a], now),
        playlist("PL3", "No match", [d], now),
      ],
    });

    const { playlists } = await readJson(
      catalog,
      `/recommend?ids=${a},${c}&limit=10`,
    );

    expect(playlists.map((p: any) => p.id)).toEqual(["PL2", "PL1"]);
    expect(playlists[0].score).toBe(20);
    expect(playlists[1].score).toBe(10);
    expect(
      playlists.every((p: any) => p.tracks.length > 0 && p.trackCount > 0),
    ).toBe(true);
    expect(playlists[0].trackCount).toBe(2);
    expect(playlists[0].tracks[0]).toMatchObject({ id: c, author: "Artist C" });

    const empty = await readJson(catalog, "/recommend?ids=");
    expect(empty.playlists).toEqual([]);
  });

  test("tracks-since returns only records changed after the watermark", async () => {
    const catalog = new CatalogDO(fakeDurableState() as any);
    const now = Date.now();

    await postJson(catalog, "/tracks", {
      tracks: [
        canonicalTrack("aaaaaaaaaaa", "Old", "Old Artist", now),
        canonicalTrack("bbbbbbbbbbb", "New", "New Artist", now + 10_000),
      ],
    });

    const since = await readJson(catalog, `/tracks-since?since=${now + 5_000}`);
    expect(since.map((t: any) => t.id)).toEqual(["bbbbbbbbbbb"]);

    const all = await readJson(catalog, "/tracks-since?since=0");
    expect(all).toHaveLength(2);

    const none = await readJson(catalog, `/tracks-since?since=${now + 20_000}`);
    expect(none).toEqual([]);
  });
});

describe("catalog/recommendations", () => {
  test("categories can be listed and filtered by type", async () => {
    const catalog = new CatalogDO(fakeDurableState() as any);

    const written = await postJson(catalog, "/categories", {
      categories: [
        { slug: "chill", type: "mood", title: "Chill", params: "P1" },
        { slug: "rock", type: "genre", title: "Rock", params: "P2" },
      ],
    });
    expect(await written.json()).toEqual({ written: 2 });

    const all = await readJson(catalog, "/categories");
    expect(all).toHaveLength(2);
    expect(await readJson(catalog, "/categories?type=mood")).toEqual([
      { slug: "chill", type: "mood", title: "Chill", params: "P1" },
    ]);
    expect(await readJson(catalog, "/categories?type=genre")).toHaveLength(1);
    expect(await readJson(catalog, "/categories?type=nope")).toEqual([]);
  });

  test("curated playlists are returned in the public (camelCase) shape", async () => {
    const catalog = new CatalogDO(fakeDurableState() as any);
    const now = Date.now();

    await postJson(catalog, "/tracks", {
      tracks: [canonicalTrack("aaaaaaaaaaa", "Song A", "Artist A", now)],
    });
    await postJson(catalog, "/playlists", {
      playlists: [
        playlist("PL1", "Chill Mix", ["aaaaaaaaaaa"], now),
        playlist("PL2", "Chill Nights", [], now),
      ],
    });

    const byCategory = await readJson(catalog, "/playlists?category=chill");
    expect(byCategory).toHaveLength(2);
    expect(byCategory[0]).toMatchObject({
      id: "PL1",
      categorySlug: "chill",
      categoryType: "mood",
      sectionTitle: "Chill",
      title: "Chill Mix",
      trackIds: ["aaaaaaaaaaa"],
      updatedAt: now,
    });
    // No DB column names may leak through the public shape.
    expect(Object.keys(byCategory[0]).some((k) => k.includes("_"))).toBe(false);

    expect(await readJson(catalog, "/playlists?category=other")).toEqual([]);
    expect(await readJson(catalog, "/playlists")).toHaveLength(2);
  });

  test("getFeatured returns an empty shelf for no artists", async () => {
    const getFeatured = (await import("../src/backend/getFeatured")).default;
    const res = await getFeatured(undefined, [], 5);
    expect(res).toHaveProperty("featuredPlaylists");
    expect(res).toHaveProperty("artists");
    expect(res.featuredPlaylists).toEqual([]);
    expect(res.artists).toEqual([]);
  });
});

describe("user sync/relations and hydration", () => {
  const user = "a".repeat(64);

  /** A catalog instance shared with the user DO, wired through a fake binding. */
  function linkedCatalog() {
    const catalog = new CatalogDO(fakeDurableState() as any);
    const env: any = {
      CATALOG_DO: {
        idFromName: () => "global",
        get: () => ({ fetch: (req: Request) => catalog.fetch(req) }),
      },
    };
    return {
      catalog,
      userDO: new UserSyncDO({ ...fakeDurableState(), env } as any),
    };
  }

  test("a full snapshot records relations and projects into the catalog", async () => {
    const { catalog, userDO } = linkedCatalog();
    const now = Date.now();

    await userDO.fetch(
      new Request(`http://do/library/${user}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta: { version: 5, tracks: now },
          tracks: {
            aaaaaaaaaaa: {
              id: "aaaaaaaaaaa",
              title: "Song A",
              duration: "03:00",
              author: "Artist A - Topic",
              authorId: "UC_A",
              modified: now,
            },
          },
        }),
      }),
    );

    const rows = (userDO as any).sql["exec"](
      "SELECT track_id, added_at FROM user_tracks",
    ).toArray();
    expect(rows).toEqual([{ track_id: "aaaaaaaaaaa", added_at: now }]);

    // The write-through runs in waitUntil; a real runtime flushes it before the
    // next request, so drain it here.
    await new Promise((r) => setTimeout(r, 10));
    expect((await readJson(catalog, "/track?id=aaaaaaaaaaa")).author).toBe(
      "Artist A - Topic",
    );
  });

  test("reads are hydrated from the catalog so repairs reach every user", async () => {
    const { catalog, userDO } = linkedCatalog();
    const now = Date.now();

    await userDO.fetch(
      new Request(`http://do/library/${user}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta: { version: 5, tracks: now },
          tracks: {
            aaaaaaaaaaa: {
              id: "aaaaaaaaaaa",
              title: "Song A",
              duration: "03:00",
              author: "Release - Topic",
              authorId: "",
              modified: now,
              context: { src: "search", id: "q" },
            },
          },
        }),
      }),
    );
    // Let the write-through land so the user's own row exists in the catalog.
    await new Promise((r) => setTimeout(r, 10));

    // fixMetadata repairs the corrupted artist.
    await postJson(catalog, "/tracks", {
      tracks: [
        canonicalTrack(
          "aaaaaaaaaaa",
          "Song A",
          "Artist A - Topic",
          now + 5_000,
        ),
      ],
    });

    const snapshot = await readJson(userDO, `/library/${user}`);
    expect(snapshot.tracks.aaaaaaaaaaa).toMatchObject({
      title: "Song A",
      author: "Artist A - Topic",
      // Client-only fields survive the overlay.
      context: { src: "search", id: "q" },
    });

    // A delta pull hydrates the same way.
    const delta = await (
      await userDO.fetch(
        new Request(`http://do/sync/${user}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meta: { version: 5, tracks: now + 1 } }),
        }),
      )
    ).json();
    expect(delta.delta.addedOrUpdatedTracks.aaaaaaaaaaa.author).toBe(
      "Artist A - Topic",
    );
  });

  test("a relation with no catalog row is backfilled from the local snapshot", async () => {
    const { catalog, userDO } = linkedCatalog();
    const now = Date.now();

    await userDO.fetch(
      new Request(`http://do/library/${user}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta: { version: 5, tracks: now },
          tracks: {
            zzzzzzzzzzz: {
              id: "zzzzzzzzzzz",
              title: "Legacy Song",
              duration: "04:00",
              author: "Legacy Artist",
              authorId: "UC_L",
              modified: now,
            },
          },
        }),
      }),
    );

    // Simulate a catalog that lost the record (reset, first deploy after the
    // write-through existed). The read must fall back to the local snapshot and
    // reseed the catalog rather than dropping the track.
    (catalog as any).sql.exec("DELETE FROM canonical_tracks");

    const snapshot = await userDO
      .fetch(new Request(`http://do/library/${user}`))
      .then((r: Response) => r.json());
    expect(snapshot.tracks.zzzzzzzzzzz).toMatchObject({
      title: "Legacy Song",
      author: "Legacy Artist",
    });

    await new Promise((r) => setTimeout(r, 10));
    expect((await readJson(catalog, "/track?id=zzzzzzzzzzz")).title).toBe(
      "Legacy Song",
    );
  });

  test("a repair from another user's library is never delivered to this user", async () => {
    const { catalog, userDO } = linkedCatalog();
    const now = Date.now();

    await userDO.fetch(
      new Request(`http://do/library/${user}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta: { version: 5, tracks: now },
          tracks: {
            aaaaaaaaaaa: {
              id: "aaaaaaaaaaa",
              title: "Song A",
              duration: "03:00",
              author: "Release - Topic",
              authorId: "",
              modified: now,
            },
          },
        }),
      }),
    );

    // The catalog is global: another user's favorite track and a repair for it
    // must not appear in this user's delta.
    await postJson(catalog, "/tracks", {
      tracks: [
        canonicalTrack(
          "aaaaaaaaaaa",
          "Song A",
          "Artist A - Topic",
          now + 5_000,
        ),
        canonicalTrack(
          "privatesong",
          "Someone Else's Song",
          "Private Artist",
          now + 6_000,
        ),
      ],
    });

    const delta = await (
      await userDO.fetch(
        new Request(`http://do/sync/${user}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meta: { version: 5, tracks: now + 1 } }),
        }),
      )
    ).json();

    expect(delta.delta.addedOrUpdatedTracks.aaaaaaaaaaa.author).toBe(
      "Artist A - Topic",
    );
    expect(delta.delta.addedOrUpdatedTracks.privatesong).toBeUndefined();
  });

  test("deleting a track removes its relation", async () => {
    const { userDO } = linkedCatalog();
    const now = Date.now();

    await userDO.fetch(
      new Request(`http://do/library/${user}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta: { version: 5, tracks: now },
          tracks: {
            aaaaaaaaaaa: {
              id: "aaaaaaaaaaa",
              title: "Song A",
              duration: "03:00",
              author: "Artist A - Topic",
              authorId: "UC_A",
              modified: now,
            },
          },
        }),
      }),
    );

    await userDO.fetch(
      new Request(`http://do/sync/${user}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta: {},
          addedOrUpdatedTracks: {},
          deletedTrackIds: ["aaaaaaaaaaa"],
          updatedCollections: {},
          deletedCollectionNames: [],
        }),
      }),
    );

    const rows = (userDO as any).sql["exec"](
      "SELECT count(*) as c FROM user_tracks",
    ).one().c;
    expect(rows).toBe(0);

    const snapshot = await userDO
      .fetch(new Request(`http://do/library/${user}`))
      .then((r: Response) => r.json());
    expect(snapshot.tracks.aaaaaaaaaaa).toBeUndefined();
  });
});

describe("catalog/tracksToCanonical", () => {
  test("projects library rows onto the canonical schema", () => {
    const records = tracksToCanonical([
      {
        id: "aaaaaaaaaaa",
        title: "Song A",
        duration: "03:30",
        author: "Artist A - Topic",
        authorId: "UC_A",
        modified: 1000,
      },
      {
        id: "bbbbbbbbbbb",
        title: "Song B",
        duration: "04:00",
        author: "Artist B",
        authorId: "UC_B",
      },
      {
        id: "bbbbbbbbbbb",
        title: "Duplicate",
        duration: "1:00",
        author: "Dup",
        authorId: "UC_D",
      },
      { title: "No id", duration: "1:00", author: "Ghost", authorId: "UC_G" },
    ]);

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      id: "aaaaaaaaaaa",
      duration: 210,
      isSong: true,
      source: "user_sync",
      updatedAt: 1000,
    });
    expect(records[1]).toMatchObject({ id: "bbbbbbbbbbb", isSong: false });
    expect(typeof records[1].updatedAt).toBe("number");
  });

  test("rejects rectangular thumbnails and only keeps square thumbnails for songs", () => {
    const records = tracksToCanonical([
      {
        id: "song_with_rect",
        title: "Song Rect",
        author: "Artist - Topic",
        img: "dQw4w9WgXcQ", // 11-char video ID (rectangular)
      },
      {
        id: "song_with_no_img",
        title: "Song No Img",
        author: "Artist - Topic",
      },
      {
        id: "song_with_square",
        title: "Song Square",
        author: "Artist - Topic",
        img: "/a-/AOh14Gh8_square", // square Google CDN path
      },
    ]);

    expect(records[0].thumbnailId).toBe("");
    expect(records[1].thumbnailId).toBe("");
    expect(records[2].thumbnailId).toBe("/a-/AOh14Gh8_square");
  });
});

// --- fixtures -------------------------------------------------------------

function canonicalTrack(
  id: string,
  title: string,
  author: string,
  updatedAt: number,
) {
  return {
    id,
    title,
    author,
    authorId: `UC_${author}`,
    duration: 180,
    durationStr: "03:00",
    isSong: true,
    thumbnailId: id,
    source: "innertube_scrape" as const,
    updatedAt,
  };
}

function playlist(
  id: string,
  title: string,
  trackIds: string[],
  updatedAt: number,
) {
  return {
    id,
    categorySlug: "chill",
    categoryType: "mood",
    sectionTitle: "Chill",
    title,
    thumbnailId: "",
    trackIds,
    updatedAt,
  };
}
