import type { DurableObjectState } from "@cloudflare/workers-types";
import {
  SCORE_PER_TRACK,
  isSquareThumbnail,
  type CanonicalTrack,
  type Category,
  type CuratedPlaylist,
  type Recommendation,
} from "./catalog.js";

const JSON_HEADER = { "Content-Type": "application/json" };
const MAX_TRACK_PREVIEW = 3;
const MAX_RECOMMENDATIONS = 20;
/** Cloudflare SQLite limit on bind variables is 99. Batches of 50 are safe. */
const SQL_CHUNK_SIZE = 50;

type PlaylistRow = {
  id: string;
  category_slug: string;
  category_type: string;
  section_title: string;
  title: string;
  thumbnail_id: string;
  updated_at: number;
};

/** Maps a DB row onto the public shape so every route speaks the same dialect. */
function toCuratedPlaylist(
  row: PlaylistRow,
  trackIds: string[],
): CuratedPlaylist {
  return {
    id: row.id,
    categorySlug: row.category_slug,
    categoryType: row.category_type as Category["type"],
    sectionTitle: row.section_title,
    title: row.title,
    thumbnailId: row.thumbnail_id,
    trackIds,
    updatedAt: row.updated_at,
  };
}

/**
 * Single global Durable Object holding the deduplicated catalog: canonical
 * track metadata plus the moods & genres taxonomy.
 *
 * Every consumer (link previews, fixMetadata, user sync hydration) reads from
 * this one store, so a repair benefits all of them at once.
 */
export class CatalogDO {
  private ctx: DurableObjectState;
  private sql: DurableObjectState["storage"]["sql"];
  private initialized = false;
  private trackWriteCache = new Map<string, number>();
  private readonly MAX_TRACK_CACHE = 50000;

  constructor(ctx: DurableObjectState) {
    this.ctx = ctx;
    this.sql = ctx.storage.sql;
  }

  private initSchema(): void {
    if (this.initialized) return;

    try {
      this.sql.exec(`
        CREATE TABLE IF NOT EXISTS canonical_songs (\n          id TEXT PRIMARY KEY,\n          title TEXT NOT NULL,\n          author TEXT NOT NULL,\n          author_id TEXT,\n          album_id TEXT,\n          album_title TEXT,\n          thumbnail_id TEXT NOT NULL,\n          duration INTEGER NOT NULL DEFAULT 0,\n          duration_str TEXT,\n          omv_id TEXT,\n          source TEXT NOT NULL,\n          updated_at INTEGER NOT NULL\n        );
        CREATE INDEX IF NOT EXISTS idx_songs_album ON canonical_songs(album_id);
        CREATE INDEX IF NOT EXISTS idx_songs_author ON canonical_songs(author);
        CREATE INDEX IF NOT EXISTS idx_songs_updated ON canonical_songs(updated_at);
      `);
    } catch (err) {
      console.warn("[catalog] canonical_songs table init:", err);
    }

    // Explicitly add columns for existing databases deployed prior to counterpart indexing
    try {
      this.sql.exec("ALTER TABLE canonical_songs ADD COLUMN omv_id TEXT");
    } catch {}

    try {
      this.sql.exec(
        "CREATE INDEX IF NOT EXISTS idx_songs_omv ON canonical_songs(omv_id)",
      );
    } catch {}

    try {
      this.sql.exec(`
        CREATE TABLE IF NOT EXISTS canonical_videos (\n          id TEXT PRIMARY KEY,\n          title TEXT NOT NULL,\n          author TEXT NOT NULL,\n          author_id TEXT,\n          duration INTEGER NOT NULL DEFAULT 0,\n          duration_str TEXT,\n          atv_id TEXT,\n          source TEXT NOT NULL,\n          updated_at INTEGER NOT NULL\n        );
        CREATE INDEX IF NOT EXISTS idx_videos_author ON canonical_videos(author);
        CREATE INDEX IF NOT EXISTS idx_videos_updated ON canonical_videos(updated_at);
      `);
    } catch (err) {
      console.warn("[catalog] canonical_videos table init:", err);
    }

    try {
      this.sql.exec("ALTER TABLE canonical_videos ADD COLUMN atv_id TEXT");
    } catch {}

    try {
      this.sql.exec(
        "CREATE INDEX IF NOT EXISTS idx_videos_atv ON canonical_videos(atv_id)",
      );
    } catch {}

    try {
      this.sql.exec(`
        CREATE TABLE IF NOT EXISTS canonical_tracks (\n          id TEXT PRIMARY KEY,\n          title TEXT NOT NULL,\n          author TEXT NOT NULL,\n          author_id TEXT,\n          duration INTEGER NOT NULL DEFAULT 0,\n          duration_str TEXT,\n          is_song BOOLEAN NOT NULL DEFAULT 0,\n          thumbnail_id TEXT,\n          source TEXT NOT NULL,\n          updated_at INTEGER NOT NULL\n        );
        CREATE INDEX IF NOT EXISTS idx_tracks_author ON canonical_tracks(author);
        CREATE INDEX IF NOT EXISTS idx_tracks_updated ON canonical_tracks(updated_at);

        CREATE TABLE IF NOT EXISTS categories (\n          slug TEXT NOT NULL,\n          type TEXT NOT NULL,\n          title TEXT NOT NULL,\n          params TEXT NOT NULL,\n          PRIMARY KEY (slug, type)\n        );

        CREATE TABLE IF NOT EXISTS curated_playlists (\n          id TEXT PRIMARY KEY,\n          category_slug TEXT NOT NULL,\n          category_type TEXT NOT NULL,\n          section_title TEXT NOT NULL,\n          title TEXT NOT NULL,\n          thumbnail_id TEXT,\n          updated_at INTEGER NOT NULL\n        );
        CREATE INDEX IF NOT EXISTS idx_playlists_category ON curated_playlists(category_slug, category_type);

        CREATE TABLE IF NOT EXISTS playlist_tracks (\n          playlist_id TEXT NOT NULL,\n          track_id TEXT NOT NULL,\n          position INTEGER NOT NULL,\n          PRIMARY KEY (playlist_id, track_id)\n        );
        CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track ON playlist_tracks(track_id);
      `);
    } catch (err) {
      console.warn("[catalog] schema init:", err);
    }

    this.initialized = true;
  }

  /** Fetches playlist rows by id, preserving the caller's ordering. */
  private readPlaylistRows(ids: string[]): PlaylistRow[] {
    if (ids.length === 0) return [];
    const rows: PlaylistRow[] = [];
    for (let i = 0; i < ids.length; i += SQL_CHUNK_SIZE) {
      const chunk = ids.slice(i, i + SQL_CHUNK_SIZE);
      const placeholders = chunk.map(() => "?").join(",");
      const batch = this.sql
        .exec<PlaylistRow>(
          `SELECT id, category_slug, category_type, section_title, title, thumbnail_id, updated_at
           FROM curated_playlists WHERE id IN (${placeholders})`,
          ...chunk,
        )
        .toArray();
      rows.push(...batch);
    }
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)).filter((r): r is PlaylistRow => !!r);
  }

  /** Ordered track ids per playlist, from the relational index. */
  private readPlaylistTrackIds(ids: string[]): Map<string, string[]> {
    const out = new Map<string, string[]>();
    if (ids.length === 0) return out;

    for (let i = 0; i < ids.length; i += SQL_CHUNK_SIZE) {
      const chunk = ids.slice(i, i + SQL_CHUNK_SIZE);
      const placeholders = chunk.map(() => "?").join(",");
      const rows = this.sql
        .exec<{ playlist_id: string; track_id: string }>(
          `SELECT playlist_id, track_id FROM playlist_tracks
           WHERE playlist_id IN (${placeholders}) ORDER BY playlist_id, position`,
          ...chunk,
        )
        .toArray();

      for (const r of rows) {
        const list = out.get(r.playlist_id) || [];
        list.push(r.track_id);
        out.set(r.playlist_id, list);
      }
    }
    return out;
  }

  private upsertTracks(tracks: CanonicalTrack[]): number {
    let written = 0;
    this.ctx.storage.transactionSync(() => {
      for (const t of tracks) {
        if (!t?.id) continue;
        const lastUpdated = this.trackWriteCache.get(t.id);
        if (lastUpdated !== undefined && t.updatedAt <= lastUpdated) {
          // Already in memory cache with equal or newer timestamp; skip duplicate SQLite write
          continue;
        }

        if (t.isSong) {
          const songThumb = isSquareThumbnail(t.thumbnailId)
            ? t.thumbnailId
            : "";
          this.sql.exec(
            `INSERT INTO canonical_songs
               (id, title, author, author_id, album_id, album_title, thumbnail_id, duration, duration_str, omv_id, source, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               title = excluded.title,
               author = excluded.author,
               author_id = CASE WHEN excluded.author_id != '' THEN excluded.author_id ELSE canonical_songs.author_id END,
               album_id = CASE WHEN excluded.album_id IS NOT NULL AND excluded.album_id != '' THEN excluded.album_id ELSE canonical_songs.album_id END,
               album_title = CASE WHEN excluded.album_title IS NOT NULL AND excluded.album_title != '' THEN excluded.album_title ELSE canonical_songs.album_title END,
               thumbnail_id = CASE WHEN excluded.thumbnail_id != '' THEN excluded.thumbnail_id ELSE canonical_songs.thumbnail_id END,
               duration = CASE WHEN excluded.duration > 0 THEN excluded.duration ELSE canonical_songs.duration END,
               duration_str = CASE WHEN excluded.duration > 0 THEN excluded.duration_str ELSE canonical_songs.duration_str END,
               omv_id = CASE WHEN excluded.omv_id IS NOT NULL AND excluded.omv_id != '' THEN excluded.omv_id ELSE canonical_songs.omv_id END,
               source = excluded.source,
               updated_at = excluded.updated_at
             WHERE excluded.updated_at >= canonical_songs.updated_at`,
            t.id,
            t.title,
            t.author,
            t.authorId || "",
            t.albumId || null,
            t.albumTitle || null,
            songThumb,
            t.duration,
            t.durationStr,
            t.omvId || null,
            t.source,
            t.updatedAt,
          );
        } else {
          this.sql.exec(
            `INSERT INTO canonical_videos
               (id, title, author, author_id, duration, duration_str, atv_id, source, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               title = excluded.title,
               author = excluded.author,
               author_id = CASE WHEN excluded.author_id != '' THEN excluded.author_id ELSE canonical_videos.author_id END,
               duration = CASE WHEN excluded.duration > 0 THEN excluded.duration ELSE canonical_videos.duration END,
               duration_str = CASE WHEN excluded.duration > 0 THEN excluded.duration_str ELSE canonical_videos.duration_str END,
               atv_id = CASE WHEN excluded.atv_id IS NOT NULL AND excluded.atv_id != '' THEN excluded.atv_id ELSE canonical_videos.atv_id END,
               source = excluded.source,
               updated_at = excluded.updated_at
             WHERE excluded.updated_at >= canonical_videos.updated_at`,
            t.id,
            t.title,
            t.author,
            t.authorId || "",
            t.duration,
            t.durationStr,
            t.atvId || null,
            t.source,
            t.updatedAt,
          );
        }

        this.trackWriteCache.set(t.id, t.updatedAt);
        if (this.trackWriteCache.size > this.MAX_TRACK_CACHE) {
          const first = this.trackWriteCache.keys().next().value;
          if (first) this.trackWriteCache.delete(first);
        }
        written++;
      }
    });
    return written;
  }

  private readTracks(ids: string[]): Record<string, CanonicalTrack> {
    if (ids.length === 0) return {};
    const out: Record<string, CanonicalTrack> = {};

    // 1. Read songs (with album info, square thumbnail, and omv_id) in chunks
    for (let i = 0; i < ids.length; i += SQL_CHUNK_SIZE) {
      const chunk = ids.slice(i, i + SQL_CHUNK_SIZE);
      const placeholders = chunk.map(() => "?").join(",");
      const songRows = this.sql
        .exec<{
          id: string;
          title: string;
          author: string;
          author_id: string;
          album_id: string | null;
          album_title: string | null;
          thumbnail_id: string;
          duration: number;
          duration_str: string;
          omv_id: string | null;
          source: string;
          updated_at: number;
        }>(
          `SELECT id, title, author, author_id, album_id, album_title, thumbnail_id, duration, duration_str, omv_id, source, updated_at
           FROM canonical_songs WHERE id IN (${placeholders})`,
          ...chunk,
        )
        .toArray();

      for (const r of songRows) {
        out[r.id] = {
          id: r.id,
          title: r.title,
          author: r.author,
          authorId: r.author_id,
          duration: r.duration,
          durationStr: r.duration_str,
          isSong: true,
          thumbnailId: isSquareThumbnail(r.thumbnail_id) ? r.thumbnail_id : "",
          albumId: r.album_id || undefined,
          albumTitle: r.album_title || undefined,
          omvId: r.omv_id || undefined,
          source: r.source as CanonicalTrack["source"],
          updatedAt: r.updated_at,
        };
      }
    }

    // 2. Read videos (without thumbnail_id, with atv_id) for remaining IDs in chunks
    const missingForVideos = ids.filter((id) => !out[id]);
    for (let i = 0; i < missingForVideos.length; i += SQL_CHUNK_SIZE) {
      const chunk = missingForVideos.slice(i, i + SQL_CHUNK_SIZE);
      const vPlaceholders = chunk.map(() => "?").join(",");
      const videoRows = this.sql
        .exec<{
          id: string;
          title: string;
          author: string;
          author_id: string;
          duration: number;
          duration_str: string;
          atv_id: string | null;
          source: string;
          updated_at: number;
        }>(
          `SELECT id, title, author, author_id, duration, duration_str, atv_id, source, updated_at
           FROM canonical_videos WHERE id IN (${vPlaceholders})`,
          ...chunk,
        )
        .toArray();

      for (const r of videoRows) {
        out[r.id] = {
          id: r.id,
          title: r.title,
          author: r.author,
          authorId: r.author_id,
          duration: r.duration,
          durationStr: r.duration_str,
          isSong: false,
          thumbnailId: "",
          atvId: r.atv_id || undefined,
          source: r.source as CanonicalTrack["source"],
          updatedAt: r.updated_at,
        };
      }
    }

    // 3. Fallback to canonical_tracks for any remaining legacy IDs in chunks
    const missingForTracks = ids.filter((id) => !out[id]);
    for (let i = 0; i < missingForTracks.length; i += SQL_CHUNK_SIZE) {
      const chunk = missingForTracks.slice(i, i + SQL_CHUNK_SIZE);
      const tPlaceholders = chunk.map(() => "?").join(",");
      const rows = this.sql
        .exec<{
          id: string;
          title: string;
          author: string;
          author_id: string;
          duration: number;
          duration_str: string;
          is_song: number;
          thumbnail_id: string;
          source: string;
          updated_at: number;
        }>(
          `SELECT id, title, author, author_id, duration, duration_str, is_song, thumbnail_id, source, updated_at
           FROM canonical_tracks WHERE id IN (${tPlaceholders})`,
          ...chunk,
        )
        .toArray();

      for (const r of rows) {
        out[r.id] = {
          id: r.id,
          title: r.title,
          author: r.author,
          authorId: r.author_id,
          duration: r.duration,
          durationStr: r.duration_str,
          isSong: !!r.is_song,
          thumbnailId: r.is_song
            ? isSquareThumbnail(r.thumbnail_id)
              ? r.thumbnail_id
              : ""
            : r.thumbnail_id,
          source: r.source as CanonicalTrack["source"],
          updatedAt: r.updated_at,
        };
      }
    }

    return out;
  }

  /** Resolves canonical song (ATV) counterparts for an array of video (OMV) IDs. */
  public resolveSongCounterparts(
    ids: string[],
  ): Record<string, CanonicalTrack> {
    if (ids.length === 0) return {};
    const out: Record<string, CanonicalTrack> = {};

    // 1. Join canonical_videos to canonical_songs via atv_id in chunks
    for (let i = 0; i < ids.length; i += SQL_CHUNK_SIZE) {
      const chunk = ids.slice(i, i + SQL_CHUNK_SIZE);
      const placeholders = chunk.map(() => "?").join(",");
      const joinedRows = this.sql
        .exec<{
          query_omv_id: string;
          id: string;
          title: string;
          author: string;
          author_id: string;
          album_id: string | null;
          album_title: string | null;
          thumbnail_id: string;
          duration: number;
          duration_str: string;
          omv_id: string | null;
          source: string;
          updated_at: number;
        }>(
          `SELECT
             v.id AS query_omv_id,
             s.id AS id,
             s.title AS title,
             s.author AS author,
             s.author_id AS author_id,
             s.album_id AS album_id,
             s.album_title AS album_title,
             s.thumbnail_id AS thumbnail_id,
             s.duration AS duration,
             s.duration_str AS duration_str,
             s.omv_id AS omv_id,
             s.source AS source,
             s.updated_at AS updated_at
           FROM canonical_videos v
           JOIN canonical_songs s ON v.atv_id = s.id
           WHERE v.id IN (${placeholders})`,
          ...chunk,
        )
        .toArray();

      for (const r of joinedRows) {
        out[r.query_omv_id] = {
          id: r.id,
          title: r.title,
          author: r.author,
          authorId: r.author_id,
          duration: r.duration,
          durationStr: r.duration_str,
          isSong: true,
          thumbnailId: isSquareThumbnail(r.thumbnail_id) ? r.thumbnail_id : "",
          albumId: r.album_id || undefined,
          albumTitle: r.album_title || undefined,
          omvId: r.omv_id || r.query_omv_id,
          source: r.source as CanonicalTrack["source"],
          updatedAt: r.updated_at,
        };
      }
    }

    // 2. Direct omv_id in canonical_songs for remaining unmapped IDs in chunks
    const remaining = ids.filter((id) => !out[id]);
    for (let i = 0; i < remaining.length; i += SQL_CHUNK_SIZE) {
      const chunk = remaining.slice(i, i + SQL_CHUNK_SIZE);
      const remPlaceholders = chunk.map(() => "?").join(",");
      const directSongRows = this.sql
        .exec<{
          id: string;
          title: string;
          author: string;
          author_id: string;
          album_id: string | null;
          album_title: string | null;
          thumbnail_id: string;
          duration: number;
          duration_str: string;
          omv_id: string | null;
          source: string;
          updated_at: number;
        }>(
          `SELECT id, title, author, author_id, album_id, album_title, thumbnail_id, duration, duration_str, omv_id, source, updated_at
           FROM canonical_songs WHERE omv_id IN (${remPlaceholders})`,
          ...chunk,
        )
        .toArray();

      for (const r of directSongRows) {
        if (r.omv_id) {
          out[r.omv_id] = {
            id: r.id,
            title: r.title,
            author: r.author,
            authorId: r.author_id,
            duration: r.duration,
            durationStr: r.duration_str,
            isSong: true,
            thumbnailId: isSquareThumbnail(r.thumbnail_id)
              ? r.thumbnail_id
              : "",
            albumId: r.album_id || undefined,
            albumTitle: r.album_title || undefined,
            omvId: r.omv_id,
            source: r.source as CanonicalTrack["source"],
            updatedAt: r.updated_at,
          };
        }
      }
    }

    return out;
  }

  private readTracksSince(since: number, limit: number): CanonicalTrack[] {
    const rows = this.sql
      .exec<{
        id: string;
        title: string;
        author: string;
        author_id: string;
        duration: number;
        duration_str: string;
        is_song: number;
        thumbnail_id: string;
        source: string;
        updated_at: number;
      }>(
        `SELECT id, title, author, author_id, duration, duration_str, 1 as is_song, thumbnail_id, source, updated_at
         FROM canonical_songs WHERE updated_at > ?
         UNION ALL
         SELECT id, title, author, author_id, duration, duration_str, 0 as is_song, '' as thumbnail_id, source, updated_at
         FROM canonical_videos WHERE updated_at > ?
         UNION ALL
         SELECT id, title, author, author_id, duration, duration_str, is_song, thumbnail_id, source, updated_at
         FROM canonical_tracks WHERE updated_at > ? AND id NOT IN (SELECT id FROM canonical_songs UNION ALL SELECT id FROM canonical_videos)
         ORDER BY updated_at ASC LIMIT ?`,
        since,
        since,
        since,
        limit,
      )
      .toArray();

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      author: r.author,
      authorId: r.author_id,
      duration: r.duration,
      durationStr: r.duration_str,
      isSong: !!r.is_song,
      thumbnailId: r.is_song
        ? isSquareThumbnail(r.thumbnail_id)
          ? r.thumbnail_id
          : ""
        : r.thumbnail_id,
      source: r.source as CanonicalTrack["source"],
      updatedAt: r.updated_at,
    }));
  }

  private upsertCategories(categories: Category[]): number {
    this.ctx.storage.transactionSync(() => {
      for (const c of categories) {
        this.sql.exec(
          `INSERT INTO categories (slug, type, title, params) VALUES (?, ?, ?, ?)
           ON CONFLICT(slug, type) DO UPDATE SET title = excluded.title, params = excluded.params`,
          c.slug,
          c.type,
          c.title,
          c.params,
        );
      }
    });
    return categories.length;
  }

  private upsertPlaylists(playlists: CuratedPlaylist[]): number {
    this.ctx.storage.transactionSync(() => {
      for (const p of playlists) {
        this.sql.exec(
          `INSERT INTO curated_playlists
             (id, category_slug, category_type, section_title, title, thumbnail_id, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             category_slug = excluded.category_slug,
             category_type = excluded.category_type,
             section_title = excluded.section_title,
             title = excluded.title,
             thumbnail_id = excluded.thumbnail_id,
             updated_at = excluded.updated_at
           WHERE excluded.updated_at >= curated_playlists.updated_at`,
          p.id,
          p.categorySlug,
          p.categoryType,
          p.sectionTitle,
          p.title,
          p.thumbnailId,
          p.updatedAt,
        );
        this.sql.exec(
          "DELETE FROM playlist_tracks WHERE playlist_id = ?",
          p.id,
        );
        p.trackIds.forEach((trackId, position) => {
          this.sql.exec(
            "INSERT OR REPLACE INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)",
            p.id,
            trackId,
            position,
          );
        });
      }
    });
    return playlists.length;
  }

  /**
   * Scores curated playlists by overlap with the requested ids: +10 per shared
   * track, ranked descending. Track ids are indexed, so the count runs in SQL
   * instead of pulling every playlist into the isolate.
   */
  private recommend(ids: string[], limit: number): Recommendation[] {
    const safeIds = ids.slice(0, SQL_CHUNK_SIZE);
    const placeholders = safeIds.map(() => "?").join(",");
    const matches = this.sql
      .exec<{ playlist_id: string; matches: number }>(
        `SELECT playlist_id, COUNT(*) as matches
         FROM playlist_tracks WHERE track_id IN (${placeholders})
         GROUP BY playlist_id ORDER BY matches DESC, playlist_id ASC LIMIT ?`,
        ...safeIds,
        limit,
      )
      .toArray();

    if (matches.length === 0) return [];

    const playlistIds = matches.map((m) => m.playlist_id);
    const rows = this.readPlaylistRows(playlistIds);
    const orderedIds = this.readPlaylistTrackIds(playlistIds);

    const previewIds: string[] = [];
    for (const match of matches.slice(0, MAX_TRACK_PREVIEW)) {
      previewIds.push(
        ...(orderedIds.get(match.playlist_id) || []).slice(
          0,
          MAX_TRACK_PREVIEW,
        ),
      );
    }
    const tracks = this.readTracks([...new Set(previewIds)]);

    return matches.flatMap((match, index) => {
      const row = rows[index];
      if (!row) return [];
      const ordered = orderedIds.get(row.id) || [];
      // Deliberately not \`trackIds\`: a recommendation carries the count and a
      // short preview, not the whole ordering.
      return [
        {
          id: row.id,
          categorySlug: row.category_slug,
          categoryType: row.category_type as Category["type"],
          sectionTitle: row.section_title,
          title: row.title,
          thumbnailId: row.thumbnail_id,
          updatedAt: row.updated_at,
          score: match.matches * SCORE_PER_TRACK,
          trackCount: ordered.length,
          tracks: ordered
            .slice(0, MAX_TRACK_PREVIEW)
            .map((id) => tracks[id])
            .filter(Boolean),
        } satisfies Recommendation,
      ];
    });
  }

  async fetch(request: Request): Promise<Response> {
    try {
      this.initSchema();
      const url = new URL(request.url);
      const path = url.pathname.replace(/^\/+/, "");

      switch (path) {
        case "tracks": {
          if (request.method === "GET") {
            const body = this.readTracks(
              [...new Set((url.searchParams.get("ids") || "").split(","))]
                .map((s) => s.trim())
                .filter(Boolean),
            );
            return new Response(JSON.stringify(body), {
              status: 200,
              headers: JSON_HEADER,
            });
          }
          if (request.method === "POST") {
            const body = (await request.json().catch(() => null)) as {
              tracks?: CanonicalTrack[];
            } | null;
            const tracks = body?.tracks;
            if (!Array.isArray(tracks)) {
              return new Response(JSON.stringify({ error: "Missing tracks" }), {
                status: 400,
                headers: JSON_HEADER,
              });
            }
            const written = this.upsertTracks(
              tracks.filter((t) => t && typeof t.id === "string"),
            );
            return new Response(JSON.stringify({ written }), {
              status: 200,
              headers: JSON_HEADER,
            });
          }
          break;
        }

        case "track": {
          const id = url.searchParams.get("id") || "";
          if (!id) {
            return new Response(JSON.stringify({ error: "Missing id" }), {
              status: 400,
              headers: JSON_HEADER,
            });
          }
          const track = this.readTracks([id])[id];
          if (!track) {
            return new Response(JSON.stringify({ error: "Not found" }), {
              status: 404,
              headers: JSON_HEADER,
            });
          }
          return new Response(JSON.stringify(track), {
            status: 200,
            headers: JSON_HEADER,
          });
        }

        case "counterparts": {
          if (request.method === "GET") {
            const ids = [
              ...new Set((url.searchParams.get("ids") || "").split(",")),
            ]
              .map((s) => s.trim())
              .filter(Boolean);
            const body = this.resolveSongCounterparts(ids);
            return new Response(JSON.stringify(body), {
              status: 200,
              headers: JSON_HEADER,
            });
          }
          return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: JSON_HEADER,
          });
        }

        case "tracks-since": {
          // Repair propagation: a syncing client asks for canonical records that
          // changed after its watermark so a fixed artist reaches every library.
          const since = parseInt(url.searchParams.get("since") || "0", 10) || 0;
          const limit = Math.min(
            parseInt(url.searchParams.get("limit") || "200", 10) || 200,
            500,
          );
          return new Response(
            JSON.stringify(this.readTracksSince(since, limit)),
            {
              status: 200,
              headers: JSON_HEADER,
            },
          );
        }

        case "categories": {
          if (request.method === "GET") {
            const type = url.searchParams.get("type");
            const rows = type
              ? this.sql
                  .exec<Category>(
                    "SELECT slug, type, title, params FROM categories WHERE type = ? ORDER BY title",
                    type,
                  )
                  .toArray()
              : this.sql
                  .exec<Category>(
                    "SELECT slug, type, title, params FROM categories ORDER BY type, title",
                  )
                  .toArray();
            return new Response(JSON.stringify(rows), {
              status: 200,
              headers: JSON_HEADER,
            });
          }
          if (request.method === "POST") {
            const body = (await request.json().catch(() => null)) as {
              categories?: Category[];
            } | null;
            if (!Array.isArray(body?.categories)) {
              return new Response(
                JSON.stringify({ error: "Missing categories" }),
                { status: 400, headers: JSON_HEADER },
              );
            }
            const written = this.upsertCategories(
              body.categories.filter((c) => c && c.slug && c.title),
            );
            return new Response(JSON.stringify({ written }), {
              status: 200,
              headers: JSON_HEADER,
            });
          }
          break;
        }

        case "playlists": {
          if (request.method === "GET") {
            const categorySlug = url.searchParams.get("category");
            const limit = Math.min(
              parseInt(url.searchParams.get("limit") || "100", 10) || 100,
              200,
            );
            const rows = categorySlug
              ? this.sql
                  .exec<PlaylistRow>(
                    `SELECT id, category_slug, category_type, section_title, title, thumbnail_id, updated_at
                     FROM curated_playlists WHERE category_slug = ? ORDER BY title LIMIT ?`,
                    categorySlug,
                    limit,
                  )
                  .toArray()
              : this.sql
                  .exec<PlaylistRow>(
                    `SELECT id, category_slug, category_type, section_title, title, thumbnail_id, updated_at
                     FROM curated_playlists ORDER BY category_type, title LIMIT ?`,
                    limit,
                  )
                  .toArray();

            const trackIds = this.readPlaylistTrackIds(rows.map((r) => r.id));
            return new Response(
              JSON.stringify(
                rows.map((row) =>
                  toCuratedPlaylist(row, trackIds.get(row.id) || []),
                ),
              ),
              { status: 200, headers: JSON_HEADER },
            );
          }
          if (request.method === "POST") {
            const body = (await request.json().catch(() => null)) as {
              playlists?: CuratedPlaylist[];
            } | null;
            if (!Array.isArray(body?.playlists)) {
              return new Response(
                JSON.stringify({ error: "Missing playlists" }),
                { status: 400, headers: JSON_HEADER },
              );
            }
            const written = this.upsertPlaylists(
              body.playlists.filter((p) => p && p.id && p.title),
            );
            return new Response(JSON.stringify({ written }), {
              status: 200,
              headers: JSON_HEADER,
            });
          }
          break;
        }

        case "featured":
        case "recommend": {
          const ids = (url.searchParams.get("ids") || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          if (ids.length === 0) {
            return new Response(JSON.stringify({ playlists: [] }), {
              status: 200,
              headers: JSON_HEADER,
            });
          }
          const limit = Math.min(
            parseInt(url.searchParams.get("limit") || "10", 10) ||
              MAX_RECOMMENDATIONS,
            MAX_RECOMMENDATIONS,
          );
          return new Response(
            JSON.stringify({ playlists: this.recommend(ids, limit) }),
            { status: 200, headers: JSON_HEADER },
          );
        }
      }

      return new Response("Not Found", { status: 404 });
    } catch (err: any) {
      console.error("[catalog] DO fetch failed:", err);
      const isQuota =
        err?.message?.toLowerCase().includes("quota") ||
        err?.message?.toLowerCase().includes("limit") ||
        err?.message?.toLowerCase().includes("full");
      return new Response(
        JSON.stringify({
          error: isQuota
            ? "Catalog storage quota temporarily exceeded"
            : err instanceof Error
              ? err.message
              : "Catalog error",
        }),
        {
          status: isQuota ? 429 : 500,
          headers: JSON_HEADER,
        },
      );
    }
  }
}
