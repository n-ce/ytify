import type { DurableObjectState } from "@cloudflare/workers-types";
import { scrapeCategory, type ScrapedCategory } from "./cron/scraper.js";
import {
  SCORE_PER_TRACK,
  type CanonicalTrack,
  type Category,
  type CuratedPlaylist,
  type Recommendation,
} from "./catalog.js";

const JSON_HEADER = { "Content-Type": "application/json" };
const MAX_TRACK_PREVIEW = 3;
const MAX_RECOMMENDATIONS = 20;
/** Categories scraped per alarm tick: keeps a tick well inside the CPU budget. */
const SCRAPE_BATCH_SIZE = 1;
/** Pause between alarm ticks so the scraper looks human-paced to InnerTube. */
const SCRAPE_TICK_DELAY_MS = 5000;
const SCRAPE_MAX_ATTEMPTS = 3;

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
 * track metadata plus the moods & genres taxonomy curated by the scraper.
 *
 * Every consumer (link previews, fixMetadata, user sync hydration, the
 * recommendation endpoint) reads from this one store, so a repair or a scrape
 * benefits all of them at once.
 */
export class CatalogDO {
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
      CREATE TABLE IF NOT EXISTS canonical_songs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        author_id TEXT,
        album_id TEXT,
        album_title TEXT,
        thumbnail_id TEXT NOT NULL,
        duration INTEGER NOT NULL DEFAULT 0,
        duration_str TEXT,
        omv_id TEXT,
        source TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_songs_album ON canonical_songs(album_id);
      CREATE INDEX IF NOT EXISTS idx_songs_author ON canonical_songs(author);
      CREATE INDEX IF NOT EXISTS idx_songs_updated ON canonical_songs(updated_at);
      CREATE INDEX IF NOT EXISTS idx_songs_omv ON canonical_songs(omv_id);

      CREATE TABLE IF NOT EXISTS canonical_videos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        author_id TEXT,
        duration INTEGER NOT NULL DEFAULT 0,
        duration_str TEXT,
        atv_id TEXT,
        source TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_videos_author ON canonical_videos(author);
      CREATE INDEX IF NOT EXISTS idx_videos_updated ON canonical_videos(updated_at);
      CREATE INDEX IF NOT EXISTS idx_videos_atv ON canonical_videos(atv_id);

      CREATE TABLE IF NOT EXISTS canonical_tracks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        author_id TEXT,
        duration INTEGER NOT NULL DEFAULT 0,
        duration_str TEXT,
        is_song BOOLEAN NOT NULL DEFAULT 0,
        thumbnail_id TEXT,
        source TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tracks_author ON canonical_tracks(author);
      CREATE INDEX IF NOT EXISTS idx_tracks_updated ON canonical_tracks(updated_at);

      CREATE TABLE IF NOT EXISTS categories (
        slug TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        params TEXT NOT NULL,
        PRIMARY KEY (slug, type)
      );

      CREATE TABLE IF NOT EXISTS curated_playlists (
        id TEXT PRIMARY KEY,
        category_slug TEXT NOT NULL,
        category_type TEXT NOT NULL,
        section_title TEXT NOT NULL,
        title TEXT NOT NULL,
        thumbnail_id TEXT,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_playlists_category ON curated_playlists(category_slug, category_type);

      CREATE TABLE IF NOT EXISTS playlist_tracks (
        playlist_id TEXT NOT NULL,
        track_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        PRIMARY KEY (playlist_id, track_id)
      );
      CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track ON playlist_tracks(track_id);

      CREATE TABLE IF NOT EXISTS pending_scrape (
        slug TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        params TEXT NOT NULL,
        browse_id TEXT,
        section_title TEXT,
        attempts INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Gracefully handle column additions for existing tables
    try {
      this.sql.exec("ALTER TABLE canonical_songs ADD COLUMN omv_id TEXT");
    } catch {}
    try {
      this.sql.exec("ALTER TABLE canonical_videos ADD COLUMN atv_id TEXT");
    } catch {}

    this.initialized = true;
  }

  /** Fetches playlist rows by id, preserving the caller's ordering. */
  private readPlaylistRows(ids: string[]): PlaylistRow[] {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(",");
    const rows = this.sql
      .exec<PlaylistRow>(
        `SELECT id, category_slug, category_type, section_title, title, thumbnail_id, updated_at
         FROM curated_playlists WHERE id IN (${placeholders})`,
        ...ids,
      )
      .toArray();
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)).filter((r): r is PlaylistRow => !!r);
  }

  /** Ordered track ids per playlist, from the relational index. */
  private readPlaylistTrackIds(ids: string[]): Map<string, string[]> {
    const out = new Map<string, string[]>();
    if (ids.length === 0) return out;

    const placeholders = ids.map(() => "?").join(",");
    const rows = this.sql
      .exec<{ playlist_id: string; track_id: string }>(
        `SELECT playlist_id, track_id FROM playlist_tracks
         WHERE playlist_id IN (${placeholders}) ORDER BY playlist_id, position`,
        ...ids,
      )
      .toArray();

    for (const r of rows) {
      const list = out.get(r.playlist_id) || [];
      list.push(r.track_id);
      out.set(r.playlist_id, list);
    }
    return out;
  }

  private upsertTracks(tracks: CanonicalTrack[]): number {
    let written = 0;
    this.ctx.storage.transactionSync(() => {
      for (const t of tracks) {
        if (t.isSong) {
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
            t.thumbnailId || "",
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

        // Backward compatibility table for legacy queries and existing tests
        this.sql.exec(
          `INSERT INTO canonical_tracks
             (id, title, author, author_id, duration, duration_str, is_song, thumbnail_id, source, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             author = excluded.author,
             author_id = excluded.author_id,
             duration = CASE WHEN excluded.duration > 0 THEN excluded.duration ELSE canonical_tracks.duration END,
             duration_str = CASE WHEN excluded.duration > 0 THEN excluded.duration_str ELSE canonical_tracks.duration_str END,
             is_song = excluded.is_song,
             thumbnail_id = CASE WHEN excluded.thumbnail_id != '' THEN excluded.thumbnail_id ELSE canonical_tracks.thumbnail_id END,
             source = excluded.source,
             updated_at = excluded.updated_at
           WHERE excluded.updated_at >= canonical_tracks.updated_at`,
          t.id,
          t.title,
          t.author,
          t.authorId,
          t.duration,
          t.durationStr,
          t.isSong ? 1 : 0,
          t.thumbnailId,
          t.source,
          t.updatedAt,
        );
        written++;
      }
    });
    return written;
  }

  private readTracks(ids: string[]): Record<string, CanonicalTrack> {
    if (ids.length === 0) return {};
    const placeholders = ids.map(() => "?").join(",");
    const out: Record<string, CanonicalTrack> = {};

    // 1. Read songs (with album info, square thumbnail, and omv_id)
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
        ...ids,
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
        thumbnailId: r.thumbnail_id,
        albumId: r.album_id || undefined,
        albumTitle: r.album_title || undefined,
        omvId: r.omv_id || undefined,
        source: r.source as CanonicalTrack["source"],
        updatedAt: r.updated_at,
      };
    }

    // 2. Read videos (without thumbnail_id, with atv_id) for remaining IDs
    const missingForVideos = ids.filter((id) => !out[id]);
    if (missingForVideos.length > 0) {
      const vPlaceholders = missingForVideos.map(() => "?").join(",");
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
          ...missingForVideos,
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

    // 3. Fallback to canonical_tracks for any remaining legacy IDs
    const missingForTracks = ids.filter((id) => !out[id]);
    if (missingForTracks.length > 0) {
      const tPlaceholders = missingForTracks.map(() => "?").join(",");
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
          ...missingForTracks,
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
          thumbnailId: r.thumbnail_id,
          source: r.source as CanonicalTrack["source"],
          updatedAt: r.updated_at,
        };
      }
    }

    return out;
  }

  /** Resolves canonical song (ATV) counterparts for an array of video (OMV) IDs. */
  public resolveSongCounterparts(ids: string[]): Record<string, CanonicalTrack> {
    if (ids.length === 0) return {};
    const placeholders = ids.map(() => "?").join(",");
    const out: Record<string, CanonicalTrack> = {};

    // 1. Join canonical_videos to canonical_songs via atv_id
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
        ...ids,
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
        thumbnailId: r.thumbnail_id,
        albumId: r.album_id || undefined,
        albumTitle: r.album_title || undefined,
        omvId: r.omv_id || r.query_omv_id,
        source: r.source as CanonicalTrack["source"],
        updatedAt: r.updated_at,
      };
    }

    // 2. Direct omv_id in canonical_songs for remaining unmapped IDs
    const remaining = ids.filter((id) => !out[id]);
    if (remaining.length > 0) {
      const remPlaceholders = remaining.map(() => "?").join(",");
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
          ...remaining,
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
            thumbnailId: r.thumbnail_id,
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
        `SELECT id, title, author, author_id, duration, duration_str, is_song, thumbnail_id, source, updated_at
         FROM canonical_tracks WHERE updated_at > ? ORDER BY updated_at ASC LIMIT ?`,
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
      thumbnailId: r.thumbnail_id,
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
    const placeholders = ids.map(() => "?").join(",");
    const matches = this.sql
      .exec<{ playlist_id: string; matches: number }>(
        `SELECT playlist_id, COUNT(*) as matches
         FROM playlist_tracks WHERE track_id IN (${placeholders})
         GROUP BY playlist_id ORDER BY matches DESC, playlist_id ASC LIMIT ?`,
        ...ids,
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
      // Deliberately not `trackIds`: a recommendation carries the count and a
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
          const ids = [...new Set((url.searchParams.get("ids") || "").split(","))]
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

      case "scrape-jobs": {
        if (request.method === "GET") {
          const alarmAt = await this.ctx.storage.getAlarm();
          return new Response(
            JSON.stringify({
              pending: this.countPending(),
              alarmAt: alarmAt ?? null,
            }),
            { status: 200, headers: JSON_HEADER },
          );
        }
        if (request.method === "POST") {
          const body = (await request.json().catch(() => null)) as {
            categories?: Category[];
            start?: boolean;
          } | null;
          if (!Array.isArray(body?.categories)) {
            return new Response(
              JSON.stringify({ error: "Missing categories" }),
              { status: 400, headers: JSON_HEADER },
            );
          }
          const queued = this.parkScrapeJobs(body.categories);
          if (body.start !== false) await this.ctx.storage.setAlarm(Date.now());
          return new Response(JSON.stringify({ queued }), {
            status: 200,
            headers: JSON_HEADER,
          });
        }
        break;
      }
    }

    return new Response("Not Found", { status: 404 });
  }

  private countPending(): number {
    return this.sql
      .exec<{ c: number }>("SELECT count(*) as c FROM pending_scrape")
      .one().c;
  }

  /**
   * Parks categories in SQLite for alarm-driven scraping. A Durable Object alarm
   * is the whole scheduler, so the weekly refresh needs no paid queue binding:
   * the cron handler discovers, this parks, and `alarm()` drains one at a time.
   */
  private parkScrapeJobs(categories: Category[]): number {
    let queued = 0;
    this.ctx.storage.transactionSync(() => {
      for (const category of categories) {
        if (!category || !category.slug || !category.params) continue;
        this.sql.exec(
          `INSERT INTO pending_scrape (slug, type, title, params, browse_id, section_title, attempts)
           VALUES (?, ?, ?, ?, ?, ?, 0)
           ON CONFLICT(slug) DO UPDATE SET
             type = excluded.type,
             title = excluded.title,
             params = excluded.params,
             browse_id = excluded.browse_id,
             section_title = excluded.section_title,
             attempts = 0`,
          category.slug,
          category.type,
          category.title,
          category.params,
          category.browseId || "",
          category.sectionTitle || category.type,
        );
        queued++;
      }
    });
    return queued;
  }

  async alarm(): Promise<void> {
    this.initSchema();

    const next = this.sql
      .exec<Category & { params: string; browse_id: string }>(
        `SELECT slug, type, title, params, browse_id FROM pending_scrape
         ORDER BY attempts ASC, slug ASC LIMIT ${SCRAPE_BATCH_SIZE}`,
      )
      .toArray();

    if (next.length === 0) return;

    try {
      for (const category of next) {
        await this.processScrapeJob(category);
      }
    } catch (err) {
      console.error("[scraper] alarm tick failed:", err);
    } finally {
      // Always reschedule while work remains. Losing this line on an unexpected
      // throw would strand the backlog with nothing left to wake it up.
      if (this.countPending() > 0) {
        await this.ctx.storage.setAlarm(Date.now() + SCRAPE_TICK_DELAY_MS);
      }
    }
  }

  /**
   * One queued category. `scrape` is injectable so the retry/drop bookkeeping
   * can be exercised without touching InnerTube.
   */
  private async processScrapeJob(
    category: Category & { params: string; browse_id?: string },
    scrape: (category: Category) => Promise<ScrapedCategory> = scrapeCategory,
  ): Promise<void> {
    try {
      const result = await scrape({
        ...category,
        browseId: category.browseId || category.browse_id,
        sectionTitle: category.sectionTitle || category.type,
      });
      this.upsertCategories([category]);
      this.upsertPlaylists(result.playlists);
      this.upsertTracks(result.tracks);
      this.sql.exec("DELETE FROM pending_scrape WHERE slug = ?", category.slug);
      console.log(
        `[scraper] ${category.slug}: ${result.playlists.length} playlists, ${result.tracks.length} tracks`,
      );
    } catch (err) {
      // A poisoned category is dropped after a few tries rather than being
      // retried forever on every weekly cycle.
      this.sql.exec(
        "UPDATE pending_scrape SET attempts = attempts + 1 WHERE slug = ?",
        category.slug,
      );
      const attempts = this.sql
        .exec<{ attempts: number }>(
          "SELECT attempts FROM pending_scrape WHERE slug = ?",
          category.slug,
        )
        .toArray()[0];
      if ((attempts?.attempts || 0) >= SCRAPE_MAX_ATTEMPTS) {
        console.error(
          `[scraper] ${category.slug} failed ${SCRAPE_MAX_ATTEMPTS} times, dropping`,
          err,
        );
        this.sql.exec(
          "DELETE FROM pending_scrape WHERE slug = ?",
          category.slug,
        );
      } else {
        console.warn(`[scraper] ${category.slug} failed:`, err);
      }
    }
  }
}
