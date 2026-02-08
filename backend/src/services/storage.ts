// Storage service: SQLite + LRU Cache

import { Database } from "@db/sqlite";
import { config } from "../config.ts";
import { LRUCache } from "./cache.ts";
import { generateEtag } from "./etag.ts";
import type { LibrarySnapshot, LibraryWithMeta } from "../types/library.ts";

// Singleton database instance
let db: Database | null = null;

// In-memory caches
const libraryCache = new LRUCache<string, LibraryWithMeta>(config.cacheMaxSize, config.cacheTtlMs);
const staticCache = new LRUCache<string, string>(config.cacheMaxSize, config.cacheTtlMs);

// Initialize storage and create tables
export async function initStorage(): Promise<void> {
  // Ensure data directory exists
  try {
    await Deno.mkdir("./data", { recursive: true });
  } catch {
    // Directory may already exist
  }

  db = new Database(config.dbPath);

  // Enable WAL mode for better concurrent read performance
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS libraries (
      user_hash TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      etag TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS static_content (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_libraries_updated ON libraries(updated_at);
    CREATE INDEX IF NOT EXISTS idx_static_created ON static_content(created_at);
  `);

  console.log(`Database initialized at ${config.dbPath}`);
}

// Close database connection
export function closeStorage(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// --- Library Operations ---

export function getLibrary(userHash: string): LibraryWithMeta | null {
  // Check cache first
  const cached = libraryCache.get(userHash);
  if (cached) {
    return cached;
  }

  if (!db) throw new Error("Database not initialized");

  const row = db.prepare(
    "SELECT data, etag FROM libraries WHERE user_hash = ?"
  ).get(userHash) as { data: string; etag: string } | undefined;

  if (!row) return null;

  const result: LibraryWithMeta = {
    data: JSON.parse(row.data),
    etag: row.etag,
  };

  // Populate cache
  libraryCache.set(userHash, result);
  return result;
}

export function setLibrary(
  userHash: string,
  data: LibrarySnapshot,
  existingEtag?: string
): string {
  if (!db) throw new Error("Database not initialized");

  const newEtag = existingEtag || generateEtag(data);
  const now = Date.now();
  const jsonData = JSON.stringify(data);

  db.prepare(`
    INSERT INTO libraries (user_hash, data, etag, updated_at, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_hash) DO UPDATE SET
      data = excluded.data,
      etag = excluded.etag,
      updated_at = excluded.updated_at
  `).run(userHash, jsonData, newEtag, now, now);

  // Update cache
  libraryCache.set(userHash, { data, etag: newEtag });

  return newEtag;
}

export function setLibraryWithEtagCheck(
  userHash: string,
  data: LibrarySnapshot,
  clientEtag: string
): { success: boolean; newEtag?: string } {
  if (!db) throw new Error("Database not initialized");

  // Get current ETag
  const current = getLibrary(userHash);
  if (!current) {
    return { success: false };
  }

  // Check ETag match (optimistic locking)
  if (current.etag !== clientEtag) {
    return { success: false };
  }

  const newEtag = setLibrary(userHash, data);
  return { success: true, newEtag };
}

export function deleteLibrary(userHash: string): boolean {
  if (!db) throw new Error("Database not initialized");

  const result = db.prepare("DELETE FROM libraries WHERE user_hash = ?").run(userHash);
  libraryCache.delete(userHash);
  return result > 0;
}

// --- Static Content Operations ---

export function getStaticContent(id: string): string | null {
  // Check cache first
  const cached = staticCache.get(id);
  if (cached !== undefined) {
    return cached;
  }

  if (!db) throw new Error("Database not initialized");

  const row = db.prepare(
    "SELECT data FROM static_content WHERE id = ?"
  ).get(id) as { data: string } | undefined;

  if (!row) return null;

  // Populate cache
  staticCache.set(id, row.data);
  return row.data;
}

export function setStaticContent(id: string, data: string): void {
  if (!db) throw new Error("Database not initialized");

  const now = Date.now();

  db.prepare(`
    INSERT INTO static_content (id, data, created_at)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      data = excluded.data
  `).run(id, data, now);

  // Update cache
  staticCache.set(id, data);
}

export function getLatestStaticContent(): { id: string; data: string } | null {
  if (!db) throw new Error("Database not initialized");

  const row = db.prepare(
    "SELECT id, data FROM static_content ORDER BY created_at DESC LIMIT 1"
  ).get() as { id: string; data: string } | undefined;

  return row || null;
}

// --- Cleanup Operations ---

export function cleanupOldData(retentionDays = 100): number {
  if (!db) throw new Error("Database not initialized");

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  const librariesDeleted = db.prepare(
    "DELETE FROM libraries WHERE updated_at < ?"
  ).run(cutoff);

  const staticDeleted = db.prepare(
    "DELETE FROM static_content WHERE created_at < ?"
  ).run(cutoff);

  // Clear caches after cleanup
  libraryCache.cleanup();
  staticCache.cleanup();

  return librariesDeleted + staticDeleted;
}

// --- Health Check ---

export function isHealthy(): boolean {
  if (!db) return false;

  try {
    db.prepare("SELECT 1").get();
    return true;
  } catch {
    return false;
  }
}
