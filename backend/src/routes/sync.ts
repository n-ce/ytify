// GET/POST/PUT /sync/:hash - Delta sync with ETag support

import { Hono } from "hono";
import { getLibrary, setLibrary } from "../services/storage.ts";
import { generateEtag } from "../services/etag.ts";
import type {
  LibrarySnapshot,
  Meta,
  DeltaPayload,
  SyncPullResponse,
} from "../types/library.ts";

const app = new Hono();

// GET /sync/:hash - Return the parsed meta and ETag
app.get("/sync/:hash", (c) => {
  const userHash = c.req.param("hash");

  if (!userHash) {
    return c.json({ error: "User ID hash not provided." }, 400);
  }

  try {
    const library = getLibrary(userHash);

    if (!library) {
      return c.json(
        { error: "No library found. Perform a full sync first." },
        404
      );
    }

    const snapshot = library.data;
    const meta = (snapshot.meta as Meta) || { version: 4, tracks: 0 };

    return c.json(meta, 200, {
      ETag: library.etag,
    });
  } catch (e) {
    console.error(`Error during GET /sync for user ${userHash}:`, e);
    return c.json({ error: "Internal server error." }, 500);
  }
});

// POST /sync/:hash - Smart Pull (Delta Sync)
app.post("/sync/:hash", async (c) => {
  const userHash = c.req.param("hash");

  if (!userHash) {
    return c.json({ error: "User ID hash not provided." }, 400);
  }

  try {
    const body = await c.req.json();
    const clientMeta: Meta = body.meta;

    const library = getLibrary(userHash);

    if (!library) {
      return c.json({ error: "No library found." }, 404);
    }

    const snapshot = library.data;
    const serverMeta = (snapshot.meta as Meta) || { version: 4, tracks: 0 };

    const delta: DeltaPayload = {
      meta: serverMeta,
      addedOrUpdatedTracks: {},
      deletedTrackIds: [],
      updatedCollections: {},
      deletedCollectionNames: [],
    };

    let hasChanges = false;
    let isFullTrackSync = false;

    // 1. Compare Tracks
    // If server tracks are newer, we send ALL tracks (current limitation)
    if ((serverMeta.tracks || 0) > (clientMeta.tracks || 0)) {
      delta.addedOrUpdatedTracks =
        (snapshot.tracks as Record<string, unknown>) || {};
      hasChanges = true;
      isFullTrackSync = true;
    }

    // 2. Compare Collections
    for (const key in serverMeta) {
      if (key === "version" || key === "tracks") continue;

      if ((serverMeta[key] || 0) > (clientMeta[key] || 0)) {
        delta.updatedCollections[key] = snapshot[key];
        hasChanges = true;
      }
    }

    // 3. Detect Deletions (Server has it removed, Client still has it)
    for (const key in clientMeta) {
      if (key === "version" || key === "tracks") continue;
      // If server doesn't have it, it's deleted
      if (!serverMeta[key]) {
        delta.deletedCollectionNames.push(key);
        hasChanges = true;
      }
    }

    const response: SyncPullResponse = {
      serverMeta,
      delta: hasChanges ? delta : null,
      fullSyncRequired: false,
      isFullTrackSync,
    };

    return c.json(response, 200, {
      ETag: library.etag,
    });
  } catch (e) {
    console.error(`Error during POST /sync for user ${userHash}:`, e);
    return c.json({ error: "Internal server error." }, 500);
  }
});

// PUT /sync/:hash - Apply delta payload
app.put("/sync/:hash", async (c) => {
  const userHash = c.req.param("hash");

  if (!userHash) {
    return c.json({ error: "User ID hash not provided." }, 400);
  }

  const clientETag = c.req.header("if-match");
  if (!clientETag) {
    return c.json(
      { error: "Missing If-Match header for Compare-and-Swap." },
      400
    );
  }

  try {
    const library = getLibrary(userHash);

    if (!library) {
      return c.json(
        { error: "Cannot apply delta to a non-existent library." },
        404
      );
    }

    // Check ETag for optimistic locking
    if (library.etag !== clientETag) {
      return c.json(
        { error: "Conflict: Library updated by another device." },
        412
      );
    }

    const delta: DeltaPayload = await c.req.json();
    const currentSnapshot = library.data;
    const newSnapshot = applyDelta(currentSnapshot, delta);

    // Generate new ETag and save
    const newEtag = generateEtag(newSnapshot);
    setLibrary(userHash, newSnapshot, newEtag);

    return c.body(null, 204);
  } catch (e) {
    console.error(`Error during PUT /sync for user ${userHash}:`, e);
    return c.json({ error: "Internal server error during sync." }, 500);
  }
});

// Apply delta to current snapshot
function applyDelta(
  current: LibrarySnapshot,
  delta: DeltaPayload
): LibrarySnapshot {
  const next: LibrarySnapshot = { ...current };

  // 1. Merge Meta
  if (!next.meta) next.meta = { version: 4, tracks: 0 };
  Object.assign(next.meta, delta.meta);

  // 2. Merge Tracks
  if (!next.tracks) next.tracks = {};
  Object.assign(next.tracks, delta.addedOrUpdatedTracks);
  for (const id of delta.deletedTrackIds) {
    delete next.tracks[id];
  }

  // 3. Merge Collections
  for (const [name, collectionData] of Object.entries(
    delta.updatedCollections
  )) {
    next[name] = collectionData;
  }

  // 4. Delete Collections
  for (const name of delta.deletedCollectionNames) {
    delete next[name];
    if (next.meta) delete next.meta[name];
  }

  return next;
}

export default app;
