import type { DurableObjectState } from "@cloudflare/workers-types";

const JSON_HEADER = { "Content-Type": "application/json" };

/**
 * Upper bound on how long one upstream call may hold a lease. The edge function
 * mirrors this value and aborts the upstream call at the same deadline, so a
 * hung provider can never leave a lease dangling past the provider timeout.
 */
const LEASE_TTL_MS = 10000;
/** Per-IP admission window; the edge function mirrors this for its backstop. */
const IP_COOLDOWN_MS = 20000;
const KEY_QUOTA = 500;
const MAX_KEY_SLOTS = 32;

export type LeaseRow = {
  lease_key: string;
  active_session: string | null;
  in_flight_until: number;
  last_completed_at: number;
};

export type KeyRow = {
  idx: number;
  remaining: number;
  reset_at: number;
};

export type GateState = {
  leases: LeaseRow[];
  keys: KeyRow[];
  cooldowns: { ip: string; lastSeen: number }[];
};

type AcquireBody = {
  key?: string;
  ip?: string;
  ttlMs?: number;
  keyCount?: number;
};

type ReleaseBody = {
  key?: string;
  ip?: string;
  keyIndex?: number;
  remaining?: number;
  resetAt?: number;
};

type AcquireResult =
  | {
      granted: true;
      leaseUntil: number;
      keyIndex: number;
      keyRemaining: number;
      keyResetAt: number;
    }
  | { granted: false; reason: "leased" | "cooldown"; retryAfterMs: number };

/**
 * Single-writer gatekeeper for the emergency RapidAPI fallback.
 *
 * A Durable Object is a globally unique single-threaded actor, so the
 * read-check-write below is atomic by construction. That is what Netlify Blobs
 * could never give us: parallel requests with the same session used to all read
 * the pre-write state and fire upstream together.
 *
 * Leases and IP cooldowns are transient (10s and 20s TTL) and stored in memory
 * maps to eliminate disk SQLite row writes on every playback. RapidAPI key quotas
 * remain persistent in SQLite.
 */
export class StreamGateDO {
  private sql: DurableObjectState["storage"]["sql"];
  private initialized = false;

  // In-memory transient locks to save thousands of SQLite row writes daily
  private memLeases = new Map<string, LeaseRow>();
  private memCooldowns = new Map<string, number>();

  constructor(ctx: DurableObjectState) {
    this.sql = ctx.storage.sql;
  }

  private initSchema(): void {
    if (this.initialized) return;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS rapidapi_keys (
        idx INTEGER PRIMARY KEY,
        remaining INTEGER NOT NULL DEFAULT ${KEY_QUOTA},
        reset_at INTEGER NOT NULL DEFAULT 0
      );
    `);
    this.initialized = true;
  }

  private readLease(key: string): LeaseRow {
    const mem = this.memLeases.get(key);
    if (mem) return mem;

    return {
      lease_key: key,
      active_session: null,
      in_flight_until: 0,
      last_completed_at: 0,
    };
  }

  /**
   * Picks the RapidAPI key with the most remaining quota, considering all
   * available keys up to `keyCount` and treating keys past their reset timestamp
   * as fully replenished.
   */
  private bestKey(keyCount = 1): KeyRow {
    const now = Date.now();
    const rows = this.sql
      .exec<KeyRow>("SELECT idx, remaining, reset_at FROM rapidapi_keys")
      .toArray();

    const map = new Map<number, KeyRow>();
    for (const r of rows) {
      map.set(
        r.idx,
        now > r.reset_at
          ? { idx: r.idx, remaining: KEY_QUOTA, reset_at: 0 }
          : r,
      );
    }

    const available: KeyRow[] = [];
    const count = Math.max(1, Math.min(keyCount, MAX_KEY_SLOTS));
    for (let i = 0; i < count; i++) {
      const entry = map.get(i);
      if (entry) {
        available.push(entry);
      } else {
        available.push({ idx: i, remaining: KEY_QUOTA, reset_at: 0 });
      }
    }

    available.sort(
      (a, b) => b.remaining - a.remaining || a.reset_at - b.reset_at,
    );
    return available[0];
  }

  /**
   * Atomic admission check: grants a lease only when this key holds none and
   * the caller is outside the cooldown window. Rejection is immediate, with no
   * queuing, so a burst cannot amplify into upstream calls.
   */
  private acquire(body: AcquireBody): AcquireResult {
    const now = Date.now();
    const key = body.key || "anonymous";
    const ttl = Math.min(Math.max(body.ttlMs || LEASE_TTL_MS, 1000), 30000);
    const lease = this.readLease(key);
    const ip = body.ip;

    if (lease.in_flight_until > now) {
      return {
        granted: false,
        reason: "leased",
        retryAfterMs: lease.in_flight_until - now,
      };
    }

    if (ip) {
      const lastSeen = this.memCooldowns.get(ip) || 0;
      if (lastSeen && now - lastSeen <= IP_COOLDOWN_MS) {
        return {
          granted: false,
          reason: "cooldown",
          retryAfterMs: lastSeen + IP_COOLDOWN_MS - now,
        };
      }
    }

    this.memLeases.set(key, {
      lease_key: key,
      active_session: key,
      in_flight_until: now + ttl,
      last_completed_at: lease.last_completed_at || 0,
    });

    if (ip) {
      this.memCooldowns.set(ip, now);
    }

    const best = this.bestKey(body.keyCount || 1);
    return {
      granted: true,
      leaseUntil: now + ttl,
      keyIndex: best.idx,
      keyRemaining: best.remaining,
      keyResetAt: best.reset_at,
    };
  }

  /**
   * Releases a lease. The lease always expires on its own if this call is lost,
   * so a crash can never wedge a key permanently.
   */
  private release(body: ReleaseBody): { ok: boolean } {
    const now = Date.now();
    const key = body.key || "anonymous";
    const lease = this.readLease(key);

    if (lease.in_flight_until > now) {
      this.memLeases.set(key, {
        lease_key: key,
        active_session: null,
        in_flight_until: 0,
        last_completed_at: now,
      });
    }

    if (typeof body.keyIndex === "number" && body.keyIndex >= 0) {
      const idx = Math.min(body.keyIndex, MAX_KEY_SLOTS - 1);
      this.sql.exec(
        `INSERT INTO rapidapi_keys (idx, remaining, reset_at) VALUES (?, ?, ?)
         ON CONFLICT(idx) DO UPDATE SET
           remaining = MAX(0, excluded.remaining),
           reset_at = excluded.reset_at`,
        idx,
        typeof body.remaining === "number" ? body.remaining : KEY_QUOTA,
        typeof body.resetAt === "number" ? body.resetAt : 0,
      );
    }

    // The cooldown clock starts when a call completes, not when it begins.
    if (body.ip) {
      this.memCooldowns.set(body.ip, now);
    }

    return { ok: true };
  }

  private readState(): GateState {
    const now = Date.now();
    const leases: LeaseRow[] = [];
    for (const l of this.memLeases.values()) {
      if (l.in_flight_until > 0 || l.last_completed_at > 0) {
        leases.push(l);
      }
    }
    leases.sort((a, b) => b.last_completed_at - a.last_completed_at);

    const keys = this.sql
      .exec<KeyRow>(
        "SELECT idx, remaining, reset_at FROM rapidapi_keys ORDER BY idx",
      )
      .toArray();

    const cooldowns: { ip: string; lastSeen: number }[] = [];
    for (const [ip, lastSeen] of this.memCooldowns.entries()) {
      if (now - lastSeen < 60000) {
        cooldowns.push({ ip, lastSeen });
      }
    }
    cooldowns.sort((a, b) => b.lastSeen - a.lastSeen);

    return {
      leases: leases.slice(0, 50),
      keys,
      cooldowns: cooldowns.slice(0, 50),
    };
  }

  async fetch(request: Request): Promise<Response> {
    try {
      this.initSchema();
      const path = new URL(request.url).pathname.replace(/^\/+/, "");

      if (path === "acquire") {
        const body = (await request.json().catch(() => ({}))) as AcquireBody;
        return new Response(JSON.stringify(this.acquire(body)), {
          status: 200,
          headers: JSON_HEADER,
        });
      }

      if (path === "release") {
        const body = (await request.json().catch(() => ({}))) as ReleaseBody;
        return new Response(JSON.stringify(this.release(body)), {
          status: 200,
          headers: JSON_HEADER,
        });
      }

      if (path === "state" && request.method === "GET") {
        return new Response(JSON.stringify(this.readState()), {
          status: 200,
          headers: JSON_HEADER,
        });
      }

      if (
        path === "reset-keys" &&
        (request.method === "POST" || request.method === "GET")
      ) {
        this.sql.exec("DELETE FROM rapidapi_keys");
        return new Response(
          JSON.stringify({ ok: true, message: "Keys reset" }),
          {
            status: 200,
            headers: JSON_HEADER,
          },
        );
      }

      return new Response("Not Found", { status: 404 });
    } catch (err: any) {
      console.error("[StreamGateDO] Error handling request:", err);
      return new Response(
        JSON.stringify({ error: err?.message || "Internal gate error" }),
        { status: 500, headers: JSON_HEADER },
      );
    }
  }
}
