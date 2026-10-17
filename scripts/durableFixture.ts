import { DatabaseSync } from "node:sqlite";

/**
 * A Durable Object is backed by embedded SQLite plus a small KV surface, which
 * node:sqlite and a Map reproduce closely enough to exercise the real SQL.
 *
 * Unlike the local dev adapter this keeps `setAlarm` inert: unit tests must
 * never start a real scrape against InnerTube.
 */
export function fakeDurableState() {
  const db = new DatabaseSync(":memory:");
  const kv = new Map<string, unknown>();

  return {
    storage: {
      sql: {
        exec(query: string, ...bindings: any[]) {
          const trimmed = query.trim();
          if (trimmed.toUpperCase().startsWith("SELECT")) {
            const rows = db.prepare(query).all(...bindings) as any[];
            return {
              toArray: () => rows,
              one: () => {
                if (rows.length !== 1) {
                  throw new Error(
                    `SqlStorageCursor.one() expected exactly 1 row, got ${rows.length}`,
                  );
                }
                return rows[0];
              },
            };
          }
          if (bindings.length > 0) db.prepare(query).run(...bindings);
          else db.exec(query);
          return { toArray: () => [], one: () => undefined };
        },
      },
      transactionSync<T>(closure: () => T): T {
        db.exec("BEGIN");
        try {
          const res = closure();
          db.exec("COMMIT");
          return res;
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
      },
      async put(k: string, v: unknown) {
        kv.set(k, v);
      },
      async get(k: string) {
        return kv.get(k);
      },
      async setAlarm() {},
      async getAlarm() {
        return null;
      },
      async deleteAlarm() {},
      async deleteAll() {
        kv.clear();
      },
      waitUntil() {},
    },
  };
}

// Normalises the join: a leading slash in `path` must not produce `//route`.
export const doFetch = (instance: any, path: string, init?: RequestInit) =>
  instance.fetch(new Request(`http://do/${path.replace(/^\/+/, "")}`, init));

export const postJson = (instance: any, path: string, body: unknown) =>
  doFetch(instance, path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const readJson = async (instance: any, path: string) =>
  (await doFetch(instance, path)).json();
