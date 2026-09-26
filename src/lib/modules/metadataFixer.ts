import { getTracksMap, saveTracksMap, syncLibrary } from "@utils";
import { setStore, store } from "@stores";

/**
 * Checks whether an author string is a placeholder/corrupted "Release - Topic" or "Release".
 */
export function isCorruptedAuthor(author?: string): boolean {
  if (!author) return true;
  const a = author.trim().toLowerCase();
  return (
    a === "release - topic" ||
    a === "release" ||
    a === "various artists - topic" ||
    a === "various artists" ||
    a === "unknown"
  );
}

/**
 * Checks whether a track has a corrupted/placeholder author.
 */
export function isCorruptedTrack(track: TrackItem): boolean {
  return isCorruptedAuthor(track?.author);
}

/**
 * Runs the self-healing metadata fixer across the local track collection.
 * Step 1: Checks if any sibling track with the same authorId already has a valid author name.
 * Step 2: Falls back to the backend YouTube Music Search Songs API for remaining unresolved tracks.
 */
export async function runMetadataFixer(): Promise<void> {
  const tracksMap = getTracksMap();
  const allIds = Object.keys(tracksMap);
  if (allIds.length === 0) return;

  const corruptedIds = allIds.filter((id) => isCorruptedTrack(tracksMap[id]));
  if (corruptedIds.length === 0) return;

  let localFixed = 0;
  let backendFixed = 0;

  // Step 1: Build a local cross-reference map of known valid authors by authorId
  const validByAuthorId = new Map<string, { author: string; authorId: string }>();
  for (const id of allIds) {
    const t = tracksMap[id];
    if (t?.authorId && !isCorruptedTrack(t) && t.author?.trim()) {
      validByAuthorId.set(t.authorId, { author: t.author, authorId: t.authorId });
    }
  }

  const unresolvedTargets: Array<{ id: string; title: string }> = [];

  for (const id of corruptedIds) {
    const track = tracksMap[id];
    if (track.authorId && validByAuthorId.has(track.authorId)) {
      const match = validByAuthorId.get(track.authorId)!;
      track.author = match.author;
      track.modified = Date.now();
      localFixed++;
    } else {
      unresolvedTargets.push({ id: track.id, title: track.title });
    }
  }

  // Step 2: Query backend YouTube Music Search Songs API in batches
  if (unresolvedTargets.length > 0) {
    const BATCH_SIZE = 15;
    for (let i = 0; i < unresolvedTargets.length; i += BATCH_SIZE) {
      const chunk = unresolvedTargets.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch(`${store.api}/fix-metadata`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tracks: chunk }),
        });

        if (res.ok) {
          const result = (await res.json()) as {
            resolved?: Record<
              string,
              { author: string; authorId: string; title?: string }
            >;
          };

          if (result.resolved) {
            for (const [id, fixed] of Object.entries(result.resolved)) {
              if (tracksMap[id] && fixed.author) {
                tracksMap[id].author = fixed.author.endsWith(" - Topic")
                  ? fixed.author
                  : `${fixed.author} - Topic`;
                if (fixed.authorId) {
                  tracksMap[id].authorId = fixed.authorId;
                }
                tracksMap[id].modified = Date.now();
                backendFixed++;
              }
            }
          }
        }
      } catch (err) {
        console.warn("[metadataFixer] Batch metadata request failed:", err);
      }
    }
  }

  // Step 3: Persist updates and signal reactive stores
  if (localFixed > 0 || backendFixed > 0) {
    saveTracksMap(tracksMap);
    setStore("libraryUpdated", (c) => (c || 0) + 1);
    syncLibrary("schedule");
    console.log(
      `[metadataFixer] Repaired ${localFixed} tracks locally and ${backendFixed} tracks via backend.`,
    );
  }
}

/**
 * Resolves metadata for an individual track on-demand (e.g. during active playback).
 */
export async function fixSingleTrack(track: TrackItem): Promise<TrackItem> {
  if (!isCorruptedTrack(track)) return track;

  try {
    const res = await fetch(`${store.api}/fix-metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracks: [{ id: track.id, title: track.title }] }),
    });

    if (res.ok) {
      const result = (await res.json()) as {
        resolved?: Record<
          string,
          { author: string; authorId: string; title?: string }
        >;
      };
      const fixed = result.resolved?.[track.id];
      if (fixed?.author) {
        track.author = fixed.author.endsWith(" - Topic")
          ? fixed.author
          : `${fixed.author} - Topic`;
        if (fixed.authorId) track.authorId = fixed.authorId;
        track.modified = Date.now();
      }
    }
  } catch (err) {
    console.warn("[metadataFixer] Failed to fix single track metadata:", err);
  }

  return track;
}
