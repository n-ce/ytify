import type { DurableObjectState } from "@cloudflare/workers-types";

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
 * UserSyncDO
 *
 * Cloudflare Durable Object managing per-user synchronized library state,
 * playlists, favorites, and delta syncs.
 */
export class UserSyncDO {
  private ctx: DurableObjectState;
  private sql: DurableObjectState["storage"]["sql"];
  private initialized = false;

  constructor(ctx: DurableObjectState) {
    this.ctx = ctx;
    this.sql = ctx.storage.sql;
  }

  private initSchema(): void {
    if (this.initialized) return;
    try {
      this.sql.exec(`
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY,
          value INTEGER
        );
        CREATE TABLE IF NOT EXISTS tracks (
          id TEXT PRIMARY KEY,
          data TEXT,
          modified INTEGER
        );
        CREATE TABLE IF NOT EXISTS collections (
          name TEXT PRIMARY KEY,
          data TEXT,
          modified INTEGER
        );
        CREATE TABLE IF NOT EXISTS deleted_tracks (
          id TEXT PRIMARY KEY,
          deleted_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS deleted_collections (
          name TEXT PRIMARY KEY,
          deleted_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS user_tracks (
          track_id TEXT PRIMARY KEY,
          added_at INTEGER,
          custom_title TEXT,
          custom_artist TEXT,
          custom_data TEXT
        );
      `);
    } catch (err) {
      console.warn("[userSync] schema init:", err);
    }
    try {
      this.migrateRelations();
    } catch (err) {
      console.warn("[userSync] migrateRelations failed:", err);
    }
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
    for (const t of tracks) {
      this.sql.exec(
        "INSERT OR REPLACE INTO user_tracks (track_id, added_at) VALUES (?, ?)",
        t.id,
        t.modified || now,
      );
    }
  }

  private dropRelations(ids: string[]): void {
    if (ids.length === 0) return;
    for (let i = 0; i < ids.length; i += SQL_CHUNK_SIZE) {
      const slice = ids.slice(i, i + SQL_CHUNK_SIZE);
      const placeholders = slice.map(() => "?").join(",");
      this.sql.exec(
        `DELETE FROM user_tracks WHERE track_id IN (${placeholders})`,
        ...slice,
      );
    }
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

  private getFullSnapshot(): LibrarySnapshot {
    const snapshot: LibrarySnapshot = { meta: this.getMeta(), tracks: {} };

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
  }

  private touch(): void {
    const now = Date.now();
    this.sql.exec(
      "INSERT OR REPLACE INTO meta (key, value) VALUES ('tracks', ?)",
      now,
    );
  }

  async fetch(request: Request): Promise<Response> {
    try {
      this.initSchema();
      const url = new URL(request.url);
      const p = url.pathname.replace(/^\/+/, "");
      const m = request.method;

      if (p.startsWith("library")) {
        if (m === "GET") {
          const snapshot = this.hasLibrary()
            ? this.getFullSnapshot()
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
            return new Response(
              "No library found. Perform a full sync first.",
              {
                status: 404,
                headers: JSON_HEADER,
              },
            );
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
    } catch (err: any) {
      console.error("[userSync] fetch error:", err);
      const isQuota =
        err?.message?.toLowerCase().includes("quota") ||
        err?.message?.toLowerCase().includes("limit") ||
        err?.message?.toLowerCase().includes("full");
      return new Response(
        JSON.stringify({
          error: isQuota
            ? "Sync storage quota temporarily exceeded"
            : err instanceof Error
              ? err.message
              : "UserSync error",
        }),
        {
          status: isQuota ? 429 : 500,
          headers: JSON_HEADER,
        },
      );
    }
  }
}
