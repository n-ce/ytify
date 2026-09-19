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
const parse = <T>(val: string, fallback: T): T => {
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

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
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value REAL NOT NULL);
      CREATE TABLE IF NOT EXISTS tracks (id TEXT PRIMARY KEY, data TEXT NOT NULL, modified REAL NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_tracks_mod ON tracks(modified);
      CREATE TABLE IF NOT EXISTS collections (name TEXT PRIMARY KEY, data TEXT NOT NULL, modified REAL NOT NULL);
      CREATE TABLE IF NOT EXISTS deleted_tracks (id TEXT PRIMARY KEY, deleted_at REAL NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_del_tracks ON deleted_tracks(deleted_at);
      CREATE TABLE IF NOT EXISTS deleted_collections (name TEXT PRIMARY KEY, deleted_at REAL NOT NULL);
    `);
    this.initialized = true;
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
    for (const r of this.sql
      .exec<{ id: string; data: string }>("SELECT id, data FROM tracks")
      .toArray()) {
      snapshot.tracks[r.id] = parse(r.data, null as any);
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
        "DELETE FROM meta; DELETE FROM tracks; DELETE FROM collections; DELETE FROM deleted_tracks; DELETE FROM deleted_collections;",
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
        return new Response(
          JSON.stringify(
            this.hasLibrary()
              ? this.getFullSnapshot()
              : { meta: { version: 5, tracks: 0 }, tracks: {} },
          ),
          { status: 200, headers: JSON_HEADER },
        );
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
          delta.meta.tracks = serverMeta.tracks || Date.now();
          hasChanges = isFullTrackSync = true;
        } else if ((serverMeta.tracks || 0) > clientTracksTs) {
          for (const r of this.sql
            .exec<{ id: string; data: string }>(
              "SELECT id, data FROM tracks WHERE modified > ?",
              clientTracksTs,
            )
            .toArray()) {
            delta.addedOrUpdatedTracks[r.id] = parse(r.data, null as any);
          }
          delta.meta.tracks = serverMeta.tracks;
          hasChanges = true;
        }

        for (const [key, serverTime] of Object.entries(serverMeta)) {
          if (key === "version" || key === "tracks") continue;
          if (
            clientMeta[key] === undefined ||
            (serverTime || 0) > (clientMeta[key] || 0)
          ) {
            const rows = this.sql
              .exec<{ data: string }>(
                "SELECT data FROM collections WHERE name = ?",
                key,
              )
              .toArray();
            if (rows.length > 0) {
              delta.updatedCollections[key] = parse(rows[0].data, []);
              delta.meta[key] = serverTime;
              hasChanges = true;
            }
          }
        }

        for (const col of this.sql
          .exec<{ name: string; deleted_at: number }>(
            "SELECT name, deleted_at FROM deleted_collections",
          )
          .toArray()) {
          if (
            (clientMeta[col.name] === undefined ||
              (clientMeta[col.name] || 0) <= col.deleted_at) &&
            !delta.deletedCollectionNames.includes(col.name)
          ) {
            delta.deletedCollectionNames.push(col.name);
            hasChanges = true;
          }
        }

        if (clientTracksTs > 0) {
          for (const trk of this.sql
            .exec<{ id: string }>(
              "SELECT id FROM deleted_tracks WHERE deleted_at > ?",
              clientTracksTs,
            )
            .toArray()) {
            if (!delta.deletedTrackIds.includes(trk.id)) {
              delta.deletedTrackIds.push(trk.id);
              hasChanges = true;
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
