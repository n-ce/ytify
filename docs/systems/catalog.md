# Global Normalized Catalog Specification

## Purpose

Provide one deduplicated, shared record of every track ytify has ever resolved,
so metadata repairs, user sync, link previews and recommendations all read from
the same place instead of three disconnected stores.

## Requirements

### REQ-CAT-001: Single Global Catalog Entity

The catalog MUST live in one Cloudflare Durable Object (`CatalogDO`, DO name
`global`) and MUST be the only store of canonical track metadata.

- **Schema**: `canonical_tracks`, `categories`, `curated_playlists`,
  `playlist_tracks` (the last one is a relational index, not spec'd duplication:
  `track_ids` ordering is reconstructed from it)
- **Record shape**: `id, title, author, author_id, duration, duration_str,
is_song, thumbnail_id, source, updated_at`
- **Provenance**: `source` is one of `innertube_scrape`, `user_sync`,
  `fix_metadata`, `oembed`
- **Per-user DOs never duplicate canonical metadata**: `UserSyncDO` owns user
  relations and projects a copy into the catalog on every ingest

### REQ-CAT-002: Catalog Write-Through

Every resolution path MUST update the catalog so later readers benefit.

- `fixMetadata` writes `fix_metadata` records with the resolved author
- `UserSyncDO` projects `addedOrUpdatedTracks` (delta) and full library PUTs as
  `user_sync` records, via `ctx.waitUntil` so sync latency is unaffected
- The scraper writes `innertube_scrape` records on every weekly cycle
- The link-preview path writes oEmbed results back on a catalog miss

### REQ-CAT-003: Merge Semantics

Writes MUST NOT regress a record.

- `updated_at >= stored.updated_at` gates every overwrite
- A write with `duration = 0` (a metadata repair has no duration) MUST preserve
  the stored duration and duration string
- A write with an empty `thumbnail_id` MUST preserve the stored thumbnail
- Consequence: a repair never clobbers a richer scrape, and vice versa

### REQ-CAT-003b: Repair Propagation

A catalog fix MUST reach every user without a manual reset.

- `UserSyncDO.user_tracks` holds the relational view of a library (track id,
  `added_at`, `play_count`, `custom_data`); the JSON snapshot rows are retained
  as the offline/fallback copy, not as the source of truth
- Reads overlay canonical values onto the local snapshot, keeping snapshot-only
  fields (client `context`, anything a future client adds)
- A delta pull additionally asks the catalog for canonical records changed after
  the client's watermark (`/tracks-since`) and delivers the ones the user owns
- **Isolation**: the catalog is global, so the overlay MUST intersect with the
  requesting user's own `user_tracks` — a repair for another user's track is
  never delivered
- The returned watermark is the newest row the pull actually delivered, so a
  batch larger than the per-pull cap resumes instead of being skipped
- Known gap: a repair landing between a pull and that client's next push can be
  masked by the single global `meta.tracks` watermark. This is inherent to the
  v5 sync protocol and is strictly better than the previous behaviour, where
  repairs never propagated at all
- A relation whose catalog row is missing (older library, catalog reset) falls
  back to the local snapshot and reseeds the catalog

### REQ-CAT-003c: Storage

The user DO still stores the snapshot JSON on purpose: the library must render
offline, and DO SQLite size is not the constraint the duplication critique
assumed (thousands of small rows are megabytes at most). What was removed is
the _metadata authority_, which now has exactly one home.

### REQ-CAT-004: Link Previews Never Touch RapidAPI

HTML preview responses MUST be produced without any RapidAPI call.

- **Tier 0 — gating**: any `/s/:id` request whose `Accept` is not
  `application/json` returns HTML and never reaches the audio path
- **Tier 1**: read `canonical_tracks` and render Open Graph tags (<5ms, zero
  upstream cost)
- **Tier 2**: on a miss, read YouTube's public oEmbed endpoint and write the
  result through to the catalog
- **Tier 3**: if oEmbed also fails, still return a valid card so crawlers never
  receive a bare redirect
- **Artwork**: Google's thumbnail CDN (`i.ytimg.com/vi_webp/<id>`), free and
  unauthenticated
- All values are HTML-escaped before rendering
- Concurrent crawlers for one uncached link are coalesced into a single oEmbed
  request (in-flight promise map), and the rendered card is cached at the CDN
  edge (`s-maxage=120, stale-while-revalidate=600`) so a stampede collapses

### REQ-CAT-005: In-Worker Moods & Genres Scraper

The external `Moods-And-Genres-Dataset` repository and its GitHub Actions
workflow are retired; scraping lives in the Worker.

- **Discovery**: Explore → "Moods & genres" → the landing page's headed grids
  (`Moods & moments`, `Genres`) → one job per chip. The grid header is the only
  place the mood/genre distinction is exposed
- **Browse target**: a category chip resolves to `FEmusic_moods_and_genres_category`,
  _not_ the landing page's `FEmusic_moods_and_genes`-style id. Browsing the parent
  id with the chip's params silently returns the parent page again, so each chip's
  own `browseId` is carried alongside its `params`
- **Schedule**: `crons = ["0 0 * * SUN"]` in `wrangler.toml`. The cron invocation
  only discovers and parks — it never scrapes
- **Execution**: `pending_scrape` rows in `CatalogDO`, drained by its alarm one
  category at a time (REQ-CAT-005b). No Cloudflare Queues: that is a paid add-on
  and the DO alarm does the same job
- **Containment**: one failing playlist must not fail its category job
- **Budget**: at most 20 playlists and 40 tracks per category
- **Failure limit**: a category that fails `SCRAPE_MAX_ATTEMPTS` times is
  dropped instead of being retried forever
- An alarm tick always reschedules while work remains, even if it throws, so the
  backlog can never be stranded

### REQ-CAT-005b: Alarm-Driven Scheduling

The scheduler MUST run on features the deployment already has.

- The cron handler (or `POST /api/cron/scrape`) parks categories in
  `pending_scrape` and requests an alarm
- `alarm()` scrapes one category, upserts it, then reschedules 5s later until the
  backlog is empty
- Durable Object alarms, cron triggers and DO SQLite are all included with the
  base plan; nothing in this pipeline needs a paid add-on
- `GET /api/cron/status` reports backlog depth and the next alarm tick
- `POST /api/cron/scrape?mode=direct&limit=1` scrapes inline for local checks
- A full 49-category cycle takes roughly a quarter of an hour on alarms, which is
  immaterial for a weekly job

### REQ-CAT-006: Recommendation Scoring

`GET /api/recommend?ids=...` MUST rank curated playlists by overlap.

- **Score**: +10 per track shared with the request (`SCORE_PER_TRACK`)
- **Ranking**: score descending, then playlist id ascending for a stable order
- **Zero-overlap playlists are excluded**
- The count MUST run in SQL against the indexed `playlist_tracks.track_id`
  column, not by materialising every playlist in the isolate
- Each result carries the first three resolved canonical tracks for rendering

### REQ-CAT-006b: Recommendation Consumer

The client's "For You" carousel MUST read from the worker, not from a retired
external service.

- `src/features/Library/Featured.tsx` calls `GET /api/recommend` with up to 25
  history/queue track ids and renders `title`, `id`, `thumbnailId` and
  `sectionTitle`
- The response field is `title`, not the legacy endpoint's `name`
- No other external recommendation service is referenced anywhere in `src/`

### REQ-CAT-007: Internal Route Authorisation

Catalog writes, the stream gate and the scraper trigger are internal.

- They require `x-ytify-token` to match `INTERNAL_TOKEN` when that secret is
  configured
- When `INTERNAL_TOKEN` is unset the routes stay open so local dev and
  self-hosting need no extra configuration

### REQ-CAT-007b: No Paid Dependencies

The backend MUST stay on the base Cloudflare plan.

- Storage: Durable Object SQLite
- Scheduling: cron triggers plus Durable Object alarms
- No Cloudflare Queues, Workflows, D1 or Hyperdrive

### REQ-CAT-008: Stateless Sessions

The emergency fallback's session tokens MUST NOT depend on an eventually
consistent external store.

- **Signed (preferred)**: `session_secret` is configured → tokens are
  `<issuedAt>.<HMAC-SHA256(issuedAt:ip, secret)>`, URL-safe base64. No storage,
  no round trip, no pre-warmable pool
- **Blobs (fallback)**: without the secret the previous Netlify Blobs session
  store is kept, including its lazy sweep, so unconfigured deployments and local
  dev keep working
- Both modes enforce the same server-side warm-up (10s) and TTL (30m) and both
  bind the token to the issuing IP
- The token never embeds the IP in cleartext, and it is split on `.` rather than
  `:` so IPv6 addresses cannot break parsing
- Verification uses `crypto.subtle.verify`, which is constant-time

## Completeness Criteria

| Criterion                                              | Status |
| ------------------------------------------------------ | ------ |
| Catalog holds one deduplicated record per track        | ✅     |
| Metadata repair writes through to the catalog          | ✅     |
| User sync writes through to the catalog                | ✅     |
| Stale/partial writes never regress a record            | ✅     |
| A repair reaches a user who never pushed the fix       | ✅     |
| A repair for a foreign track is never delivered        | ✅     |
| HTML preview renders with zero RapidAPI calls          | ✅     |
| oEmbed fallback populates the catalog                  | ✅     |
| Concurrent crawlers share one oEmbed request           | ✅     |
| Weekly cron parks scraper jobs                         | ✅     |
| Scraper drains through DO alarms, no paid add-on       | ✅     |
| Discovery finds ~49 categories split into moods/genres | ✅     |
| Recommendation score is +10 per shared track           | ✅     |
| Internal routes reject an invalid token                | ✅     |
| Signed sessions reject tampering and IP mismatch       | ✅     |
| No paid Cloudflare add-on is required                  | ✅     |

## Related Files

- `src/backend/CatalogDO.ts` - the catalog Durable Object, its SQL and its alarm
- `src/backend/catalog.ts` - canonical types and track projection
- `src/backend/catalogClient.ts` - worker-side catalog accessors
- `src/backend/StreamGateDO.ts` - the lease gate (see `streaming.md`)
- `src/backend/cron/scraper.ts` - InnerTube Moods & Genres scraper
- `src/backend/fixMetadata.ts` - metadata repair, now catalog-backed
- `src/backend/UserSyncDO.ts` - user relations, snapshot rows, catalog hydration
- `netlify/edge-functions/stream.ts` - tiered preview pipeline, signed sessions
- `src/features/Library/Featured.tsx` - the "For You" carousel consuming
  `/api/recommend`
- `scripts/catalog.test.ts` - catalog SQL, lease protocol, hydration, alarms
- `scripts/stream.test.ts` - signed session round trips and tampering

## Non-Goals

- Replacing the per-user library blob (offline rendering still needs a local copy)
- Serving the whole catalog to the browser (only recommendations leave the worker)
- Any new storage engine: D1 was considered and Durable Object SQLite chosen
  because the catalog needs the same single-threaded atomicity as the gate
- Paid add-ons: no Cloudflare Queues, Workflows or D1. The cron trigger, the DO
  alarm and DO SQLite cover the scheduling on the base plan
