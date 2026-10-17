import { Connect } from "vite";
import worker from "./worker.js";
import { UserSyncDO } from "./UserSyncDO.ts";
import { CatalogDO } from "./CatalogDO.ts";
import { StreamGateDO } from "./StreamGateDO.ts";
import { DatabaseSync } from "node:sqlite";

/**
 * Durable Objects are backed by embedded SQLite plus a small KV surface, which
 * node:sqlite and a Map reproduce closely enough for local development. Alarms
 * are the one extra piece: they are stored and fired on a real timer so the
 * alarm-driven scraper can be exercised with `vite dev`.
 */
function createFakeState() {
  const db = new DatabaseSync(":memory:");
  const kv = new Map<string, unknown>();
  let alarmAt: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let owner: { alarm?: () => Promise<void> } | null = null;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return {
    state: {
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
        async setAlarm(scheduledFor: number) {
          alarmAt = scheduledFor;
          clearTimer();
          const delay = Math.max(0, scheduledFor - Date.now());
          timer = setTimeout(() => {
            void owner?.alarm?.();
          }, delay);
          // Never let a synthetic alarm hold the dev server open.
          timer.unref?.();
        },
        async getAlarm() {
          return alarmAt;
        },
        async deleteAlarm() {
          alarmAt = null;
          clearTimer();
        },
        async deleteAll() {
          kv.clear();
        },
        waitUntil() {},
      },
    },
    setOwner(instance: LocalDurableObject) {
      owner = instance;
    },
  };
}

type LocalDurableObject = {
  fetch: (req: Request) => Promise<Response>;
  alarm?: () => Promise<void>;
};

const localDODatabases = new Map<string, LocalDurableObject>();

type DOClassName = "UserSyncDO" | "CatalogDO" | "StreamGateDO";

const DO_CLASSES: Record<DOClassName, new (state: any) => LocalDurableObject> = {
  UserSyncDO,
  CatalogDO,
  StreamGateDO,
};

function getLocalDO(name: string, className: DOClassName) {
  const key = `${className}:${name}`;
  if (localDODatabases.has(key)) return localDODatabases.get(key)!;

  const { state, setOwner } = createFakeState();
  const fakeState: any = { ...state, env: localEnv };
  const instance = new DO_CLASSES[className](fakeState);
  setOwner(instance);
  localDODatabases.set(key, instance);
  return instance;
}

const namespace = (className: DOClassName) => ({
  idFromName: (name: string) => ({ toString: () => name }),
  get: (id: any) => ({
    fetch: (req: Request) => getLocalDO(id.toString(), className).fetch(req),
  }),
});

const localEnv = {
  USER_SYNC_DO: namespace("UserSyncDO"),
  CATALOG_DO: namespace("CatalogDO"),
  STREAM_GATE_DO: namespace("StreamGateDO"),
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
