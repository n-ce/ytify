import { Connect } from "vite";
import worker from "./worker.js";
import { UserSyncDO } from "./UserSyncDO.ts";
import { DatabaseSync } from "node:sqlite";

const localDODatabases = new Map<string, UserSyncDO>();

function getLocalDO(hash: string): UserSyncDO {
  if (localDODatabases.has(hash)) return localDODatabases.get(hash)!;
  const db = new DatabaseSync(":memory:");
  const kv = new Map<string, unknown>();

  const fakeState: any = {
    storage: {
      sql: {
        exec(query: string, ...bindings: any[]) {
          const trimmed = query.trim();
          if (trimmed.toUpperCase().startsWith("SELECT")) {
            const rows = db.prepare(query).all(...bindings) as any[];
            return {
              toArray: () => rows,
              one: () => rows[0] || { c: 0, count: 0 },
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
      async deleteAlarm() {},
      async deleteAll() {
        kv.clear();
      },
    },
  };

  const instance = new UserSyncDO(fakeState);
  localDODatabases.set(hash, instance);
  return instance;
}

const localEnv = {
  USER_SYNC_DO: {
    idFromName: (name: string) => ({ toString: () => name }),
    get: (id: any) => ({
      fetch: (req: Request) => getLocalDO(id.toString()).fetch(req),
    }),
  } as any,
};

/**
 * Adapts the Cloudflare Worker fetch handler for use as a Vite middleware.
 */
export function createLocalAdapter() {
  return async (req: Connect.IncomingMessage, res: any) => {
    const protocol = (req.socket as any).encrypted ? "https" : "http";
    const host = req.headers.host || "localhost";
    const url = new URL(req.url || "", `${protocol}://${host}`);

    let body: Buffer | null = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks: Buffer[] = [];
      for await (const chunk of req)
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      body = Buffer.concat(chunks);
    }

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        if (Array.isArray(value)) for (const v of value) headers.append(key, v);
        else headers.set(key, value);
      }
    }

    const request = new Request(url.toString(), {
      method: req.method,
      headers,
      body: body as any,
      // @ts-ignore
      duplex: body ? "half" : undefined,
    });

    try {
      // @ts-ignore
      const response = await worker.fetch(request, localEnv, {});

      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
    } catch (err) {
      console.error("Local Worker Error:", err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Internal Server Error",
            message: (err as Error).message,
          }),
        );
      }
    }
  };
}
