import type { DurableObjectState } from "@cloudflare/workers-types";
import { tracksToCanonical } from "./catalog.js";
import { readTracks, readTracksSince, upsertTracks } from "./catalogClient.js";
import type { CanonicalTrack } from "./catalog.js";
import type { Env } from "./env.js";

interface TrackItem {
  id: string;
  title: string;
  duration: string;
  author: string;
  authorId: string;
  modified?: number;
  [key: string]: unknown;
}

type Collection = Record<string, TrackItem>;
type Meta = { version: number; tracks: number; [index: string]: number };
type CollectionData = unknown[];

interface LibrarySnapshot {
  meta: Meta;
  tracks: Collection;
  [key: string]:
    Collection | Meta | CollectionData | number | string | undefined;
}

interface DeltaPayload {
  meta: Partial<Meta>;
  addedOrUpdatedTracks: Collection;
  deletedTrackIds: string[];
  updatedCollections: Record<string, CollectionData>;
  deletedCollectionNames: string[];
}

const JSON_HEADER = { "Content-Type": "application/json" };
/** Repairs delivered per delta pull, so one cycle can never flood a client. */
const MAX_REPAIRED_PER_PULL = 200;
/** Cloudflare SQLite limit on bind variables is 99. Batches of 50 are safe. */
const SQL_CHUNK_SIZE = 50;

const parse = <T>(val: string, fallback: T): T => {
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

/**
 * Canonical values win over the local snapshot; the snapshot's own fields are
 * kept so client-only data (and the fallback for an absent record) survives.
 */
function overlayCanonical(
  snapshot: TrackItem,
  record: CanonicalTrack,
): TrackItem {
  return {
    ...snapshot,
    id: record.id,
    title: record.title,
    author: record.author,
    authorId: record.authorId,
    duration: record.durationStr || snapshot.duration,
    img:
      record.isSong && record.thumbnailId ? record.thumbnailId : snapshot.img,
    albumId: record.albumId || snapshot.albumId,
    albumTitle: record.albumTitle || snapshot.albumTitle,
    // The newer of the two keeps a client that already has the fixed value from
    // treating the row as an update during its LWW merge.
    modified: Math.max(record.updatedAt, snapshot.modified || 0),
  };
}

export class UserSyncDO {
  private ctx: DurableObjectState;
  private sql: DurableObjectState["storage"]["sql"];
  private env?: Env;
  private initialized = false;
  private lastRepairCheck = 0;
  private lastCheckedTracksTs = -1;

  constructor(ctx: DurableObjectState, env?: Env) {
    this.ctx = ctx;
    this.sql = ctx.storage.sql;
    this.env = env || (ctx as { env?: Env }).env;
  }

  private initSchema(): void {
    if (this.initialized) return;
    try {
      this.sql.exec(`
        CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS tracks (id TEXT PRIMARY KEY, data TEXT NOT NULL, modified REAL NOT NULL);
        CREATE INDEX IF NOT EXISTS idx_tracks_mod ON tracks(modified);
        CREATE TABLE IF NOT EXISTS collections (name TEXT PRIMARY KEY, data TEXT NOT NULL, modified REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS deleted_tracks (id TEXT PRIMARY KEY, deleted_at REAL NOT NULL);
        CREATE INDEX IF NOT EXISTS idx_del_tracks ON deleted_tracks(deleted_at);
        CREATE TABLE IF NOT EXISTS deleted_collections (name TEXT PRIMARY KEY, deleted_at REAL NOT NULL);
        -- Relational view of the same library: the user's ownership of a track,
        -- independent of whatever metadata snapshot happens to be stored locally.
        CREATE TABLE IF NOT EXISTS user_tracks (
          track_id TEXT PRIMARY KEY,
          added_at REAL NOT NULL,
          play_count INTEGER NOT NULL DEFAULT 0,
          custom_data TEXT
        );
      `);
    } catch (err) {
      console.warn("[userSync] schema init:", err);
    }
    this.migrateRelations();
    this.initialized = true;
  }

  /**
   * Backfills `user_tracks` from the pre-relation `tracks` rows so libraries that
   * predate the relational view keep working without a manual reset.
   */
  private migrateRelations(): void {
    const missing = this.sql
      .exec<{ id: string; modified: number }>(
        `SELECT id, modified FROM tracks
         WHERE id NOT IN (SELECT track_id FROM user_tracks)`,
      )
      .toArray();
    if (missing.length === 0) return;

    this.ctx.storage.transactionSync(() => {
      for (const row of missing) {
        this.sql.exec(
          "INSERT OR REPLACE INTO user_tracks (track_id, added_at) VALUES (?, ?)",
          row.id,
          row.modified,
        );
      }
    });
  }

  private recordRelations(tracks: TrackItem[]): void {
    if (tracks.length === 0) return;
    const now = Date.now();
    for (const track of tracks) {
      if (!track?.id) continue;
      this.sql.exec(
        `INSERT INTO user_tracks (track_id, added_at, play_count) VALUES (?, ?, 0)
         ON CONFLICT(track_id) DO NOTHING`,
        track.id,
        typeof track.modified === "number" ? track.modified : now,
      );
    }
  }

  private dropRelations(ids: string[]): void {
    for (const id of ids) {
      this.sql.exec("DELETE FROM user_tracks WHERE track_id = ?", id);
    }
  }

  /**
   * Every track a user syncs is projected into the global catalog, so the
   * metadata fighters resolve once and every user (plus link previews) benefits.
   * A catalog failure must never affect the user's own sync result, so the write
   * is fire-and-forget and `upsertTracks` never rejects.
   */
  private writeThroughToCatalog(tracks: TrackItem[]): void {
    if (!this.env?.CATALOG_DO || tracks.length === 0) return;
    const write = upsertTracks(
      this.env,
      tracksToCanonical(tracks, "user_sync"),
    );
    this.ctx.waitUntil?.(write);
  }

  private hasLibrary(): boolean {
    return (
      this.sql.exec<{ c: number }>("SELECT count(*) as c FROM meta").one().c >
        0 ||
      this.sql.exec<{ c: number }>("SELECT count(*) as c FROM tracks").one().c >
        0
    );
  }

  private getMeta(): Meta {
    const meta: Meta = { version: 5, tracks: 0 };
    for (const r of this.sql
      .exec<{ key: string; value: number }>("SELECT key, value FROM meta")
      .toArray()) {
      meta[r.key] = r.value;
    }
    return meta;
  }

  /**
   * Overlays canonical catalog metadata onto locally stored snapshots.
   *
   * This is what makes a repair land everywhere: the catalog is authoritative for
   * `title`/`author`/`authorId`/`duration`, so every device sees a fix on its next
   * pull instead of keeping its own corrupted copy. The local snapshot is spread
   * first so client-only fields (`context`, anything a future client adds) survive
   * the overlay, and it is still the fallback when the catalog has no record.
   */
  private async hydrateTracks(
    tracks: Record<string, TrackItem>,
  ): Promise<Record<string, TrackItem>> {
    const ids = Object.keys(tracks);
    if (ids.length === 0) return tracks;

    const canonical = (await readTracks(this.env, ids)) || {};
    const missing: TrackItem[] = [];

    for (const id of ids) {
      const record = canonical[id];
      if (!record) {
        missing.push(tracks[id]);
        continue;
      }
      tracks[id] = overlayCanonical(tracks[id], record);
    }

    // A relation with no catalog row means the write-through never ran for it
    // (older library, or a catalog that was reset). Seed it now so the next read
    // hydrates from the catalog like every other track.
    if (missing.length > 0) this.writeThroughToCatalog(missing);

    return tracks;
  }

  /**
   * Canonical records changed since the client's watermark that this user also
   * owns. Without this a repair would only ever reach clients whose own rows were
   * already changing, which is exactly the drift the catalog exists to remove.
   */
  private async repairedSince(
    since: number,
    limit: number,
  ): Promise<Record<string, TrackItem>> {
    const records = await readTracksSince(this.env, since, limit);
    if (records.length === 0) return {};

    const owned = new Set<string>();
    for (let i = 0; i < records.length; i += SQL_CHUNK_SIZE) {
      const slice = records.slice(i, i + SQL_CHUNK_SIZE);
      const placeholders = slice.map(() => "?").join(",");
      const ids = this.sql
        .exec<{ track_id: string }>(
          `SELECT track_id FROM user_tracks WHERE track_id IN (${placeholders})`,
          ...slice.map((r) => r.id),
        )
        .toArray()
        .map((r) => r.track_id);
      for (const id of ids) owned.add(id);
    }

    const out: Record<string, TrackItem> = {};
    for (const record of records) {
      if (!owned.has(record.id)) continue;
      out[record.id] = overlayCanonical(
        {
          id: record.id,
          title: record.title,
          duration: record.durationStr,
          author: record.author,
          authorId: record.authorId,
        },
        record,
      );
    }
    return out;
  }

  private async getFullSnapshot(): Promise<LibrarySnapshot> {
    const snapshot: LibrarySnapshot = { meta: this.getMeta(), tracks: {} };

    // Membership comes from the relational table; the snapshot rows supply the
    // fallback metadata for anything the catalog cannot resolve.
    const ids = this.sql
      .exec<{ track_id: string }>("SELECT track_id FROM user_tracks")
      .toArray()
      .map((r) => r.track_id);
    const local = new Map(
      this.sql
        .exec<{ id: string; data: string }>("SELECT id, data FROM tracks")
        .toArray()
        .map((r) => [r.id, parse(r.data, null as any) as TrackItem]),
    );

    for (const id of ids) {
      const track = local.get(id) || {
        id,
        title: "",
        duration: "",
        author: "",
        authorId: "",
      };
      track.id = id;
      snapshot.tracks[id] = track;
    }

    for (const r of this.sql
      .exec<{ name: string; data: string }>(
        "SELECT name, data FROM collections",
      )
      .toArray()) {
      snapshot[r.name] = parse(r.data, []);
    }

    snapshot.tracks = await this.hydrateTracks(snapshot.tracks);
    return snapshot;
  }

  private setFullSnapshot(snapshot: LibrarySnapshot): void {
    const now = Date.now();
    this.ctx.storage.transactionSync(() => {
      this.sql.exec(
        "DELETE FROM meta; DELETE FROM tracks; DELETE FROM collections; DELETE FROM deleted_tracks; DELETE FROM deleted_collections; DELETE FROM user_tracks;",
      );
      const meta = snapshot.meta || { version: 5, tracks: 0 };
      if (!meta.version) meta.version = 5;

      for (const [k, v] of Object.entries(meta)) {
        if (typeof v === "number")
          this.sql.exec("INSERT INTO meta (key, value) VALUES (?, ?)", k, v);
      }
      for (const [id, trk] of Object.entries(snapshot.tracks || {})) {
        this.sql.exec(
          "INSERT INTO tracks (id, data, modified) VALUES (?, ?, ?)",
          id,
          JSON.stringify(trk),
          trk.modified || now,
        );
      }
      this.writeThroughToCatalog(Object.values(snapshot.tracks || {}));
      this.recordRelations(Object.values(snapshot.tracks || {}));
      for (const [k, v] of Object.entries(snapshot)) {
        if (
          !["meta", "tracks", "deletedCollections", "deletedTracks"].includes(
            k,
          ) &&
          v !== undefined
        ) {
          this.sql.exec(
            "INSERT INTO collections (name, data, modified) VALUES (?, ?, ?)",
            k,
            JSON.stringify(v),
            typeof meta[k] === "number" ? meta[k] : now,
          );
        }
      }
    });
    this.touch();
  }

  private touch(): void {
    void this.ctx.storage.put("last_active", Date.now());
    void this.ctx.storage.setAlarm(Date.now() + 30 * 86400000);
  }

  async fetch(request: Request): Promise<Response> {
    this.initSchema();
    const url = new URL(request.url);
    const m = request.method.toUpperCase();
    const p = url.pathname.replace(/^\/api\//, "").replace(/^\//, "");

    if (p.startsWith("library")) {
      if (m === "GET") {
        const snapshot = this.hasLibrary()
          ? await this.getFullSnapshot()
          : { meta: { version: 5, tracks: 0 }, tracks: {} };
        return new Response(JSON.stringify(snapshot), {
          status: 200,
          headers: JSON_HEADER,
        });
      }
      if (m === "PUT") {
        this.setFullSnapshot((await request.json()) as LibrarySnapshot);
        return new Response(null, { status: 204, headers: JSON_HEADER });
      }
      return new Response(`Method ${m} not allowed`, { status: 405 });
    }

    if (p.startsWith("sync")) {
      if (m === "GET") {
        if (!this.hasLibrary())
          return new Response("No library found. Perform a full sync first.", {
            status: 404,
            headers: JSON_HEADER,
          });
        return new Response(JSON.stringify(this.getMeta()), {
          status: 200,
          headers: JSON_HEADER,
        });
      }

      if (m === "POST") {
        if (!this.hasLibrary())
          return new Response("No library found.", {
            status: 404,
            headers: JSON_HEADER,
          });
        const body = (await request.json().catch(() => ({}))) as {
          meta?: Meta;
        };
        const clientMeta = body?.meta || { version: 5, tracks: 0 };
        const serverMeta = this.getMeta();
        const delta: DeltaPayload = {
          meta: {},
          addedOrUpdatedTracks: {},
          deletedTrackIds: [],
          updatedCollections: {},
          deletedCollectionNames: [],
        };
        let hasChanges = false,
          isFullTrackSync = false;

        if ((serverMeta.version || 5) > (clientMeta.version || 5)) {
          delta.meta.version = serverMeta.version;
          hasChanges = true;
        }

        const clientTracksTs = clientMeta.tracks || 0;
        const trackCount = this.sql
          .exec<{ c: number }>("SELECT count(*) as c FROM tracks")
          .one().c;

        if (clientTracksTs === 0 && trackCount > 0) {
          for (const r of this.sql
            .exec<{ id: string; data: string }>("SELECT id, data FROM tracks")
            .toArray()) {
            delta.addedOrUpdatedTracks[r.id] = parse(r.data, null as any);
          }
          delta.meta.tracks = serverMeta.tracks;
          hasChanges = true;
          isFullTrackSync = true;
        } else if (trackCount > 0) {
          for (const r of this.sql
            .exec<{ id: string; data: string; modified: number }>(
              "SELECT id, data, modified FROM tracks WHERE modified > ?",
              clientTracksTs,
            )
            .toArray()) {
            delta.addedOrUpdatedTracks[r.id] = parse(r.data, null as any);
            hasChanges = true;
          }
          if (hasChanges) delta.meta.tracks = serverMeta.tracks;
        }

        // Canonical overlay for tracks repaired in the global catalog.
        // Capped per pull so one repair cycle cannot saturate a mobile client.
        const now = Date.now();
        const isClientStale = clientTracksTs < serverMeta.tracks;
        const intervalPassed = now - this.lastRepairCheck > 60_000;
        const tracksTsChanged = clientTracksTs !== this.lastCheckedTracksTs;

        if (
          !isFullTrackSync &&
          clientTracksTs > 0 &&
          (isClientStale || intervalPassed || tracksTsChanged)
        ) {
          const repaired = await this.repairedSince(
            clientTracksTs,
            MAX_REPAIRED_PER_PULL,
          );
          for (const [id, track] of Object.entries(repaired)) {
            if (!delta.addedOrUpdatedTracks[id]) {
              delta.addedOrUpdatedTracks[id] = track;
              hasChanges = true;
            }
          }
          this.lastRepairCheck = now;
          this.lastCheckedTracksTs = clientTracksTs;
        }

        if (isFullTrackSync && Object.keys(delta.addedOrUpdatedTracks).length) {
          delta.addedOrUpdatedTracks = await this.hydrateTracks(
            delta.addedOrUpdatedTracks,
          );
        }

        for (const r of this.sql
          .exec<{ name: string; data: string; modified: number }>(
            "SELECT name, data, modified FROM collections",
          )
          .toArray()) {
          const clientColTs = clientMeta[r.name] || 0;
          if (r.modified > clientColTs) {
            delta.updatedCollections[r.name] = parse(r.data, []);
            delta.meta[r.name] = r.modified;
            hasChanges = true;
          }
        }

        if (clientTracksTs > 0 && !isFullTrackSync) {
          for (const r of this.sql
            .exec<{ id: string }>(
              "SELECT id FROM deleted_tracks WHERE deleted_at > ?",
              clientTracksTs,
            )
            .toArray()) {
            delta.deletedTrackIds.push(r.id);
            hasChanges = true;
          }
        }

        for (const [name] of Object.entries(clientMeta)) {
          if (name !== "version" && name !== "tracks") {
            const clientColTs = clientMeta[name];
            if (typeof clientColTs === "number" && clientColTs > 0) {
              for (const r of this.sql
                .exec<{ name: string }>(
                  "SELECT name FROM deleted_collections WHERE name = ? AND deleted_at > ?",
                  name,
                  clientColTs,
                )
                .toArray()) {
                delta.deletedCollectionNames.push(r.name);
                hasChanges = true;
              }
            }
          }
        }

        return new Response(
          JSON.stringify({
            serverMeta,
            delta: hasChanges ? delta : null,
            fullSyncRequired: false,
            isFullTrackSync,
          }),
          { status: 200, headers: JSON_HEADER },
        );
      }

      if (m === "PUT") {
        const delta = (await request.json()) as DeltaPayload;
        const now = Date.now();

        this.ctx.storage.transactionSync(() => {
          if (
            delta.addedOrUpdatedTracks &&
            Object.keys(delta.addedOrUpdatedTracks).length > 0
          ) {
            for (const [id, track] of Object.entries(
              delta.addedOrUpdatedTracks,
            )) {
              track.modified = Math.max(track.modified || 0, now);
              this.sql.exec(
                "INSERT OR REPLACE INTO tracks (id, data, modified) VALUES (?, ?, ?)",
                id,
                JSON.stringify(track),
                track.modified,
              );
              this.sql.exec("DELETE FROM deleted_tracks WHERE id = ?", id);
            }
            this.sql.exec(
              "INSERT OR REPLACE INTO meta (key, value) VALUES ('tracks', ?)",
              now,
            );
            this.writeThroughToCatalog(
              Object.values(delta.addedOrUpdatedTracks),
            );
            this.recordRelations(Object.values(delta.addedOrUpdatedTracks));
          }

          if (delta.deletedTrackIds?.length) {
            for (const id of delta.deletedTrackIds) {
              this.sql.exec("DELETE FROM tracks WHERE id = ?", id);
              this.sql.exec(
                "INSERT OR REPLACE INTO deleted_tracks (id, deleted_at) VALUES (?, ?)",
                id,
                now,
              );
            }
            this.dropRelations(delta.deletedTrackIds);
            this.sql.exec(
              "INSERT OR REPLACE INTO meta (key, value) VALUES ('tracks', ?)",
              now,
            );
          }

          if (delta.updatedCollections) {
            for (const [name, data] of Object.entries(
              delta.updatedCollections,
            )) {
              const mod =
                typeof delta.meta?.[name] === "number"
                  ? delta.meta[name]!
                  : now;
              this.sql.exec(
                "INSERT OR REPLACE INTO collections (name, data, modified) VALUES (?, ?, ?)",
                name,
                JSON.stringify(data),
                mod,
              );
              this.sql.exec(
                "DELETE FROM deleted_collections WHERE name = ?",
                name,
              );
              this.sql.exec(
                "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
                name,
                mod,
              );
            }
          }

          if (delta.deletedCollectionNames?.length) {
            for (const name of delta.deletedCollectionNames) {
              this.sql.exec("DELETE FROM collections WHERE name = ?", name);
              this.sql.exec("DELETE FROM meta WHERE key = ?", name);
              this.sql.exec(
                "INSERT OR REPLACE INTO deleted_collections (name, deleted_at) VALUES (?, ?)",
                name,
                now,
              );
            }
          }

          if (delta.meta) {
            for (const [k, ts] of Object.entries(delta.meta)) {
              if (typeof ts === "number") {
                const cur = this.sql
                  .exec<{ value: number }>(
                    "SELECT value FROM meta WHERE key = ?",
                    k,
                  )
                  .toArray();
                this.sql.exec(
                  "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
                  k,
                  cur.length ? Math.max(cur[0].value, ts) : ts,
                );
              }
            }
          }
        });

        this.touch();
        return new Response(JSON.stringify({ serverMeta: this.getMeta() }), {
          status: 200,
          headers: JSON_HEADER,
        });
      }

      return new Response(`Method ${m} not allowed`, { status: 405 });
    }

    return new Response("Not Found", { status: 404 });
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    const lastActive = (await this.ctx.storage.get<number>("last_active")) || 0;
    if (lastActive && now - lastActive > 100 * 86400000) {
      await this.ctx.storage.deleteAll();
      return;
    }
    this.initSchema();
    const cutoff = now - 30 * 86400000;
    this.sql.exec("DELETE FROM deleted_tracks WHERE deleted_at < ?", cutoff);
    this.sql.exec(
      "DELETE FROM deleted_collections WHERE deleted_at < ?",
      cutoff,
    );
  }
}
