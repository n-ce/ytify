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
  active_session: string;
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
 * Leases are tracked per key (session id, falling back to IP) so a burst from
 * one client is serialised while unrelated clients stay independent. Quota
 * starvation is covered by the per-IP cooldown, which admits one call per IP
 * per window regardless of how many sessions that IP pre-opened.
 */
export class StreamGateDO {
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
      CREATE TABLE IF NOT EXISTS stream_lease (\n        lease_key TEXT PRIMARY KEY,
        active_session TEXT,
        in_flight_until INTEGER NOT NULL DEFAULT 0,
        last_completed_at INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS rapidapi_keys (
        idx INTEGER PRIMARY KEY,
        remaining INTEGER NOT NULL DEFAULT ${KEY_QUOTA},
        reset_at INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS ip_cooldown (
        ip TEXT PRIMARY KEY,
        last_seen INTEGER NOT NULL
      );
    `);
    this.initialized = true;
  }

  private readLease(key: string): LeaseRow {
    // Note: Cloudflare DO SQL's cursor `.one()` throws if 0 rows are returned.
    // `.toArray()[0]` safely yields undefined when no lease row exists yet.
    const row = this.sql
      .exec<LeaseRow>(
        "SELECT lease_key, active_session, in_flight_until, last_completed_at FROM stream_lease WHERE lease_key = ?",
        key,
      )
      .toArray()[0];

    return {
      lease_key: key,
      active_session: row?.active_session || "",
      in_flight_until: row?.in_flight_until || 0,
      last_completed_at: row?.last_completed_at || 0,
    };
  }

  /**
   * Picks the RapidAPI key with the most remaining quota, treating keys past
   * their reset timestamp as fully replenished.
   */
  private bestKey(): KeyRow {
    const now = Date.now();
    const rows = this.sql
      .exec<KeyRow>("SELECT idx, remaining, reset_at FROM rapidapi_keys")
      .toArray();
    const available: KeyRow[] =
      rows.length > 0
        ? rows.map((r) =>
            now > r.reset_at
              ? { idx: r.idx, remaining: KEY_QUOTA, reset_at: 0 }
              : r,
          )
        : [{ idx: 0, remaining: KEY_QUOTA, reset_at: 0 }];
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
      const row = this.sql
        .exec<{ last_seen: number }>(
          "SELECT last_seen FROM ip_cooldown WHERE ip = ?",
          ip,
        )
        .toArray()[0];
      if (row && now - row.last_seen <= IP_COOLDOWN_MS) {
        return {
          granted: false,
          reason: "cooldown",
          retryAfterMs: row.last_seen + IP_COOLDOWN_MS - now,
        };
      }
    }

    this.ctx.storage.transactionSync(() => {
      this.sql.exec(
        `INSERT INTO stream_lease (lease_key, active_session, in_flight_until, last_completed_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(lease_key) DO UPDATE SET
           active_session = excluded.active_session,
           in_flight_until = excluded.in_flight_until`,
        key,
        key,
        now + ttl,
        lease.last_completed_at || 0,
      );
      if (ip) {
        this.sql.exec(
          `INSERT INTO ip_cooldown (ip, last_seen) VALUES (?, ?)
           ON CONFLICT(ip) DO UPDATE SET last_seen = excluded.last_seen`,
          ip,
          now,
        );
      }
    });

    const best = this.bestKey();
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

    this.ctx.storage.transactionSync(() => {
      if (lease.in_flight_until > now) {
        this.sql.exec(
          `UPDATE stream_lease
           SET active_session = NULL, in_flight_until = 0, last_completed_at = ?
           WHERE lease_key = ?`,
          now,
          key,
        );
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
        this.sql.exec(
          `INSERT INTO ip_cooldown (ip, last_seen) VALUES (?, ?)
           ON CONFLICT(ip) DO UPDATE SET last_seen = excluded.last_seen`,
          body.ip,
          now,
        );
      }
    });

    return { ok: true };
  }

  private readState(): GateState {
    const leases = this.sql
      .exec<LeaseRow>(
        `SELECT lease_key, active_session, in_flight_until, last_completed_at
         FROM stream_lease WHERE in_flight_until > 0 OR last_completed_at > 0
         ORDER BY last_completed_at DESC LIMIT 50`,
      )
      .toArray();
    const keys = this.sql
      .exec<KeyRow>(
        "SELECT idx, remaining, reset_at FROM rapidapi_keys ORDER BY idx",
      )
      .toArray();
    const cooldowns = this.sql
      .exec<{ ip: string; last_seen: number }>(
        "SELECT ip, last_seen FROM ip_cooldown ORDER BY last_seen DESC LIMIT 50",
      )
      .toArray();

    return {
      leases,
      keys,
      cooldowns: cooldowns.map((r) => ({ ip: r.ip, lastSeen: r.last_seen })),
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
