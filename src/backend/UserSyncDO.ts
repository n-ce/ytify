import type { DurableObjectState } from '@cloudflare/workers-types';

interface TrackItem {
  id: string;
  title: string;
  duration: string;
  author: string;
  authorId: string;
  modified?: number;
  [key: string]: unknown;
}

type Collection = { [index: string]: TrackItem };

interface Meta {
  version: number;
  tracks: number;
  [index: string]: number;
}

type CollectionData = string[] | unknown[];

interface LibrarySnapshot {
  meta: Meta;
  tracks: Collection;
  deletedCollections?: Record<string, number>;
  deletedTracks?: Record<string, number>;
  [key: string]:
    | Collection
    | Meta
    | CollectionData
    | Record<string, number>
    | number
    | string
    | undefined;
}

interface DeltaPayload {
  meta: Partial<Meta>;
  addedOrUpdatedTracks: Collection;
  deletedTrackIds: string[];
  updatedCollections: { [collectionName: string]: CollectionData };
  deletedCollectionNames: string[];
}

const CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
};

export class UserSyncDO {
  private ctx: DurableObjectState;
  private initialized = false;

  constructor(ctx: DurableObjectState) {
    this.ctx = ctx;
  }

  private initSchema(): void {
    if (this.initialized) return;

    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value REAL NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        modified REAL NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tracks_modified ON tracks(modified);
      CREATE TABLE IF NOT EXISTS collections (
        name TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        modified REAL NOT NULL
      );
      CREATE TABLE IF NOT EXISTS deleted_tracks (
        id TEXT PRIMARY KEY,
        deleted_at REAL NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_deleted_tracks ON deleted_tracks(deleted_at);
      CREATE TABLE IF NOT EXISTS deleted_collections (
        name TEXT PRIMARY KEY,
        deleted_at REAL NOT NULL
      );
    `);

    this.initialized = true;
  }

  private hasLibrary(): boolean {
    const metaCount = this.ctx.storage.sql
      .exec<{ count: number }>('SELECT count(*) as count FROM meta')
      .one().count;
    const tracksCount = this.ctx.storage.sql
      .exec<{ count: number }>('SELECT count(*) as count FROM tracks')
      .one().count;
    return metaCount > 0 || tracksCount > 0;
  }

  private getMeta(): Meta {
    const rows = this.ctx.storage.sql
      .exec<{ key: string; value: number }>('SELECT key, value FROM meta')
      .toArray();

    const meta: Meta = { version: 5, tracks: 0 };
    for (const row of rows) {
      meta[row.key] = row.value;
    }
    return meta;
  }

  private getFullSnapshot(): LibrarySnapshot {
    const meta = this.getMeta();
    const trackRows = this.ctx.storage.sql
      .exec<{ id: string; data: string }>('SELECT id, data FROM tracks')
      .toArray();

    const tracks: Collection = {};
    for (const row of trackRows) {
      try {
        tracks[row.id] = JSON.parse(row.data);
      } catch {
        // ignore corrupted json
      }
    }

    const collectionRows = this.ctx.storage.sql
      .exec<{ name: string; data: string }>('SELECT name, data FROM collections')
      .toArray();

    const snapshot: LibrarySnapshot = {
      meta,
      tracks,
    };

    for (const row of collectionRows) {
      try {
        snapshot[row.name] = JSON.parse(row.data);
      } catch {
        // ignore corrupted json
      }
    }

    return snapshot;
  }

  private setFullSnapshot(snapshot: LibrarySnapshot): void {
    const now = Date.now();
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec('DELETE FROM meta');
      this.ctx.storage.sql.exec('DELETE FROM tracks');
      this.ctx.storage.sql.exec('DELETE FROM collections');
      this.ctx.storage.sql.exec('DELETE FROM deleted_tracks');
      this.ctx.storage.sql.exec('DELETE FROM deleted_collections');

      const meta = snapshot.meta || { version: 5, tracks: 0 };
      if (!meta.version) meta.version = 5;

      for (const [key, val] of Object.entries(meta)) {
        if (typeof val === 'number') {
          this.ctx.storage.sql.exec(
            'INSERT INTO meta (key, value) VALUES (?, ?)',
            key,
            val
          );
        }
      }

      if (snapshot.tracks) {
        for (const [id, track] of Object.entries(snapshot.tracks)) {
          const mod = track.modified || now;
          this.ctx.storage.sql.exec(
            'INSERT INTO tracks (id, data, modified) VALUES (?, ?, ?)',
            id,
            JSON.stringify(track),
            mod
          );
        }
      }

      for (const [key, val] of Object.entries(snapshot)) {
        if (['meta', 'tracks', 'deletedCollections', 'deletedTracks'].includes(key)) {
          continue;
        }
        if (val !== undefined) {
          const mod = typeof meta[key] === 'number' ? meta[key] : now;
          this.ctx.storage.sql.exec(
            'INSERT INTO collections (name, data, modified) VALUES (?, ?, ?)',
            key,
            JSON.stringify(val),
            mod
          );
        }
      }
    });

    this.touchActivity();
  }

  private touchActivity(): void {
    void this.ctx.storage.put('last_active', Date.now());
    // Schedule maintenance alarm 30 days from now
    void this.ctx.storage.setAlarm(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  async fetch(request: Request): Promise<Response> {
    this.initSchema();
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const path = url.pathname.replace(/^\/api\//, '').replace(/^\//, '');

    const isSync = path.startsWith('sync');
    const isLibrary = path.startsWith('library');

    if (isLibrary) {
      if (method === 'GET') {
        if (!this.hasLibrary()) {
          const defaultState: LibrarySnapshot = {
            meta: { version: 5, tracks: 0 },
            tracks: {},
          };
          return new Response(JSON.stringify(defaultState), {
            status: 200,
            headers: CORS_HEADERS,
          });
        }
        return new Response(JSON.stringify(this.getFullSnapshot()), {
          status: 200,
          headers: CORS_HEADERS,
        });
      }

      if (method === 'PUT') {
        const snapshot = (await request.json()) as LibrarySnapshot;
        this.setFullSnapshot(snapshot);
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }

      return new Response(`Method ${method} not allowed`, { status: 405 });
    }

    if (isSync) {
      if (method === 'GET') {
        if (!this.hasLibrary()) {
          return new Response('No library found. Perform a full sync first.', {
            status: 404,
            headers: CORS_HEADERS,
          });
        }
        return new Response(JSON.stringify(this.getMeta()), {
          status: 200,
          headers: CORS_HEADERS,
        });
      }

      // Delta Pull (Smart Pull)
      if (method === 'POST') {
        if (!this.hasLibrary()) {
          return new Response('No library found.', {
            status: 404,
            headers: CORS_HEADERS,
          });
        }

        const body = (await request.json().catch(() => ({}))) as { meta?: Meta };
        const clientMeta = body?.meta || { version: 5, tracks: 0 };
        const serverMeta = this.getMeta();

        const delta: DeltaPayload = {
          meta: {},
          addedOrUpdatedTracks: {},
          deletedTrackIds: [],
          updatedCollections: {},
          deletedCollectionNames: [],
        };

        let hasChanges = false;
        let isFullTrackSync = false;

        // Version check
        if ((serverMeta.version || 5) > (clientMeta.version || 5)) {
          delta.meta.version = serverMeta.version;
          hasChanges = true;
        }

        // Tracks delta
        const clientTracksTimestamp = clientMeta.tracks || 0;
        const totalServerTracks = this.ctx.storage.sql
          .exec<{ count: number }>('SELECT count(*) as count FROM tracks')
          .one().count;

        if (clientTracksTimestamp === 0 && totalServerTracks > 0) {
          const allTracks = this.ctx.storage.sql
            .exec<{ id: string; data: string }>('SELECT id, data FROM tracks')
            .toArray();
          for (const row of allTracks) {
            try {
              delta.addedOrUpdatedTracks[row.id] = JSON.parse(row.data);
            } catch {
              // ignore
            }
          }
          delta.meta.tracks = serverMeta.tracks || Date.now();
          isFullTrackSync = true;
          hasChanges = true;
        } else if ((serverMeta.tracks || 0) > clientTracksTimestamp) {
          const changedTracks = this.ctx.storage.sql
            .exec<{ id: string; data: string }>(
              'SELECT id, data FROM tracks WHERE modified > ?',
              clientTracksTimestamp
            )
            .toArray();
          for (const row of changedTracks) {
            try {
              delta.addedOrUpdatedTracks[row.id] = JSON.parse(row.data);
            } catch {
              // ignore
            }
          }
          delta.meta.tracks = serverMeta.tracks;
          isFullTrackSync = false;
          hasChanges = true;
        }

        // Collections delta
        for (const [key, serverTime] of Object.entries(serverMeta)) {
          if (key === 'version' || key === 'tracks') continue;
          if (
            clientMeta[key] === undefined ||
            (serverTime || 0) > (clientMeta[key] || 0)
          ) {
            const colRow = this.ctx.storage.sql
              .exec<{ data: string }>(
                'SELECT data FROM collections WHERE name = ?',
                key
              )
              .toArray();
            if (colRow.length > 0) {
              try {
                delta.updatedCollections[key] = JSON.parse(colRow[0].data);
                delta.meta[key] = serverTime;
                hasChanges = true;
              } catch {
                // ignore
              }
            }
          }
        }

        // Deleted collections tombstones
        const deletedCols = this.ctx.storage.sql
          .exec<{ name: string; deleted_at: number }>(
            'SELECT name, deleted_at FROM deleted_collections'
          )
          .toArray();
        for (const col of deletedCols) {
          if (
            clientMeta[col.name] === undefined ||
            (clientMeta[col.name] || 0) <= col.deleted_at
          ) {
            if (!delta.deletedCollectionNames.includes(col.name)) {
              delta.deletedCollectionNames.push(col.name);
              hasChanges = true;
            }
          }
        }

        // Deleted tracks tombstones
        if (clientTracksTimestamp > 0) {
          const deletedTrk = this.ctx.storage.sql
            .exec<{ id: string }>(
              'SELECT id FROM deleted_tracks WHERE deleted_at > ?',
              clientTracksTimestamp
            )
            .toArray();
          for (const trk of deletedTrk) {
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
          {
            status: 200,
            headers: CORS_HEADERS,
          }
        );
      }

      // Delta Push
      if (method === 'PUT') {
        const delta = (await request.json()) as DeltaPayload;
        const now = Date.now();

        this.ctx.storage.transactionSync(() => {
          // 1. Tracks added/updated
          if (
            delta.addedOrUpdatedTracks &&
            Object.keys(delta.addedOrUpdatedTracks).length > 0
          ) {
            for (const [id, track] of Object.entries(delta.addedOrUpdatedTracks)) {
              track.modified = Math.max(track.modified || 0, now);
              this.ctx.storage.sql.exec(
                'INSERT OR REPLACE INTO tracks (id, data, modified) VALUES (?, ?, ?)',
                id,
                JSON.stringify(track),
                track.modified
              );
              this.ctx.storage.sql.exec('DELETE FROM deleted_tracks WHERE id = ?', id);
            }
            this.ctx.storage.sql.exec(
              'INSERT OR REPLACE INTO meta (key, value) VALUES (\'tracks\', ?)',
              now
            );
          }

          // 2. Tracks deleted
          if (delta.deletedTrackIds && delta.deletedTrackIds.length > 0) {
            for (const id of delta.deletedTrackIds) {
              this.ctx.storage.sql.exec('DELETE FROM tracks WHERE id = ?', id);
              this.ctx.storage.sql.exec(
                'INSERT OR REPLACE INTO deleted_tracks (id, deleted_at) VALUES (?, ?)',
                id,
                now
              );
            }
            this.ctx.storage.sql.exec(
              'INSERT OR REPLACE INTO meta (key, value) VALUES (\'tracks\', ?)',
              now
            );
          }

          // 3. Collections added/updated
          if (delta.updatedCollections) {
            for (const [name, collectionData] of Object.entries(
              delta.updatedCollections
            )) {
              const mod = (delta.meta && typeof delta.meta[name] === 'number')
                ? delta.meta[name]!
                : now;

              this.ctx.storage.sql.exec(
                'INSERT OR REPLACE INTO collections (name, data, modified) VALUES (?, ?, ?)',
                name,
                JSON.stringify(collectionData),
                mod
              );
              this.ctx.storage.sql.exec(
                'DELETE FROM deleted_collections WHERE name = ?',
                name
              );
              this.ctx.storage.sql.exec(
                'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
                name,
                mod
              );
            }
          }

          // 4. Collections deleted
          if (
            delta.deletedCollectionNames &&
            delta.deletedCollectionNames.length > 0
          ) {
            for (const name of delta.deletedCollectionNames) {
              this.ctx.storage.sql.exec('DELETE FROM collections WHERE name = ?', name);
              this.ctx.storage.sql.exec('DELETE FROM meta WHERE key = ?', name);
              this.ctx.storage.sql.exec(
                'INSERT OR REPLACE INTO deleted_collections (name, deleted_at) VALUES (?, ?)',
                name,
                now
              );
            }
          }

          // 5. Monotonic metadata timestamps and version
          if (delta.meta) {
            for (const [key, ts] of Object.entries(delta.meta)) {
              if (typeof ts === 'number') {
                const currentVal = this.ctx.storage.sql
                  .exec<{ value: number }>('SELECT value FROM meta WHERE key = ?', key)
                  .toArray();
                const nextVal = currentVal.length > 0
                  ? Math.max(currentVal[0].value, ts)
                  : ts;
                this.ctx.storage.sql.exec(
                  'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
                  key,
                  nextVal
                );
              }
            }
          }
        });

        this.touchActivity();

        return new Response(JSON.stringify({ serverMeta: this.getMeta() }), {
          status: 200,
          headers: CORS_HEADERS,
        });
      }

      return new Response(`Method ${method} not allowed`, { status: 405 });
    }

    return new Response('Not Found', { status: 404 });
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    const lastActive = (await this.ctx.storage.get<number>('last_active')) || 0;
    const INACTIVE_THRESHOLD = 100 * 24 * 60 * 60 * 1000;

    // Inactive for > 100 days: wipe storage
    if (lastActive && now - lastActive > INACTIVE_THRESHOLD) {
      await this.ctx.storage.deleteAll();
      return;
    }

    // Prune tombstones older than 30 days
    const TOMBSTONE_THRESHOLD = 30 * 24 * 60 * 60 * 1000;
    const cutoff = now - TOMBSTONE_THRESHOLD;

    this.initSchema();
    this.ctx.storage.sql.exec('DELETE FROM deleted_tracks WHERE deleted_at < ?', cutoff);
    this.ctx.storage.sql.exec(
      'DELETE FROM deleted_collections WHERE deleted_at < ?',
      cutoff
    );
  }
}
